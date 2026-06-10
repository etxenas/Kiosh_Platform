import 'dotenv/config';
import { SalesforceClient } from './src/salesforce-client.js';
import { readFileSync, createWriteStream } from 'fs';
import { execSync } from 'child_process';

const sf = new SalesforceClient({
  instanceUrl: process.env.SF_INSTANCE_URL,
  consumerKey: process.env.SF_CONSUMER_KEY,
  consumerSecret: process.env.SF_CONSUMER_SECRET,
  username: process.env.SF_USERNAME,
});

// Get a token
await sf._getToken();
const token = sf._accessToken;
const instance = sf.instanceUrl;
const apiVer = '62.0';

// Zip the deploy folder
console.log('📦 Zipping dashboard-deploy/...');
execSync('cd dashboard-deploy && zip -r ../dashboard-deploy.zip . > /dev/null', { stdio: 'inherit' });

const zipBytes = readFileSync('dashboard-deploy.zip');
const zipB64 = zipBytes.toString('base64');
console.log(`Zip size: ${zipBytes.length} bytes`);

// Metadata SOAP deploy
const soapUrl = `${instance}/services/Soap/m/${apiVer}`;
const soapDeploy = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader><met:sessionId>${token}</met:sessionId></met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:deploy>
      <met:ZipFile>${zipB64}</met:ZipFile>
      <met:DeployOptions>
        <met:rollbackOnError>true</met:rollbackOnError>
        <met:singlePackage>true</met:singlePackage>
        <met:testLevel>NoTestRun</met:testLevel>
      </met:DeployOptions>
    </met:deploy>
  </soapenv:Body>
</soapenv:Envelope>`;

console.log('🚀 Submitting deploy...');
const r = await fetch(soapUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'text/xml; charset=UTF-8', 'SOAPAction': 'deploy' },
  body: soapDeploy,
});
const xml = await r.text();
if (!r.ok) {
  console.log('Deploy submit failed:', r.status, xml.slice(0, 1500));
  process.exit(1);
}

const idMatch = xml.match(/<id>([^<]+)<\/id>/);
if (!idMatch) {
  console.log('No deploy id:', xml.slice(0, 1500));
  process.exit(1);
}
const deployId = idMatch[1];
console.log(`Deploy id: ${deployId}`);

// Poll
async function checkStatus() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header><met:SessionHeader><met:sessionId>${token}</met:sessionId></met:SessionHeader></soapenv:Header>
  <soapenv:Body>
    <met:checkDeployStatus>
      <met:asyncProcessId>${deployId}</met:asyncProcessId>
      <met:includeDetails>true</met:includeDetails>
    </met:checkDeployStatus>
  </soapenv:Body>
</soapenv:Envelope>`;
  const rr = await fetch(soapUrl, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=UTF-8', 'SOAPAction': 'checkDeployStatus' }, body });
  return await rr.text();
}

for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 3000));
  const status = await checkStatus();
  const done = /<done>true<\/done>/.test(status);
  const success = /<success>true<\/success>/.test(status);
  const state = status.match(/<status>([^<]+)<\/status>/)?.[1];
  console.log(`[${i}] state=${state} done=${done} success=${success}`);
  if (done) {
    if (success) {
      console.log('✅ DEPLOY SUCCESS');
      // Extract created IDs
      const components = [...status.matchAll(/<componentSuccesses>([\s\S]*?)<\/componentSuccesses>/g)];
      components.forEach(c => {
        const inner = c[1];
        const name = inner.match(/<fullName>([^<]+)<\/fullName>/)?.[1];
        const id = inner.match(/<id>([^<]+)<\/id>/)?.[1];
        const type = inner.match(/<componentType>([^<]+)<\/componentType>/)?.[1];
        if (name) console.log(`  ${type || ''} ${name} → ${id || ''}`);
      });
    } else {
      console.log('❌ DEPLOY FAILED');
      const failures = [...status.matchAll(/<componentFailures>([\s\S]*?)<\/componentFailures>/g)];
      failures.forEach(f => {
        const inner = f[1];
        const name = inner.match(/<fullName>([^<]+)<\/fullName>/)?.[1];
        const problem = inner.match(/<problem>([^<]+)<\/problem>/)?.[1];
        const ptype = inner.match(/<problemType>([^<]+)<\/problemType>/)?.[1];
        console.log(`  ❌ ${name}: [${ptype}] ${problem}`);
      });
      // Also print full status if no specific failures
      if (failures.length === 0) {
        console.log(status.slice(0, 3000));
      }
    }
    break;
  }
}
