/**
 * Create CustomObjects via Tooling API MetadataContainer pattern.
 * Detta ÄR rätt sätt — Tooling API har stöd för custom objects via containers.
 */
import 'dotenv/config';
import { SalesforceClient } from './salesforce-client.js';

const sf = new SalesforceClient({
  instanceUrl: process.env.SF_INSTANCE_URL,
  consumerKey: process.env.SF_CONSUMER_KEY,
  consumerSecret: process.env.SF_CONSUMER_SECRET,
  username: process.env.SF_USERNAME,
});

const token = await sf._getToken();
const base = process.env.SF_INSTANCE_URL;
const auth = 'Bearer ' + token;

async function api(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const OBJECTS = [
  {
    fullName: 'Hyrto_Hub__c',
    label: 'Hub',
    pluralLabel: 'Hubs',
    nameField: { label: 'Hub Name', type: 'Text' },
  },
  {
    fullName: 'Hyrto_Booking__c',
    label: 'Hyrto Booking',
    pluralLabel: 'Hyrto Bookings',
    nameField: { label: 'Booking Number', type: 'AutoNumber', displayFormat: 'BOOK-{000000}' },
  },
  {
    fullName: 'Hyrto_Addon__c',
    label: 'Hyrto Addon',
    pluralLabel: 'Hyrto Addons',
    nameField: { label: 'Addon Number', type: 'AutoNumber', displayFormat: 'ADD-{000000}' },
  },
  {
    fullName: 'Hyrto_ServiceLog__c',
    label: 'Hyrto Service Log',
    pluralLabel: 'Hyrto Service Logs',
    nameField: { label: 'Service Log Number', type: 'AutoNumber', displayFormat: 'SLOG-{000000}' },
  },
];

async function main() {
  // Steg 1: Skapa MetadataContainer
  console.log('📦 Skapar MetadataContainer...');
  const c = await api('POST', '/services/data/v62.0/tooling/sobjects/MetadataContainer', {
    Name: 'Hyrtoaletter_' + Date.now(),
  });
  if (c.status !== 201) {
    console.log('❌ Container create failed:', c.status, JSON.stringify(c.data));
    return;
  }
  const containerId = c.data.id;
  console.log('✅ Container:', containerId);

  // Steg 2: Lägg till alla objects
  console.log('\n📝 Lägger till CustomObjects i container...');
  for (const o of OBJECTS) {
    const r = await api('POST', '/services/data/v62.0/tooling/sobjects/CustomObject', {
      MetadataContainerId: containerId,
      Content: JSON.stringify({
        ...o,
        deploymentStatus: 'Deployed',
        sharingModel: 'ReadWrite',
        description: 'Hyrtoaletter schema - ' + o.label,
      }),
    });
    if (r.status === 201) {
      console.log('  ✅ Added ' + o.fullName + ' (' + r.data.id + ')');
    } else {
      console.log('  ❌ ' + o.fullName + ': ' + r.status + ' ' + JSON.stringify(r.data).slice(0, 200));
    }
  }

  // Steg 3: ContainerAsyncRequest (deploy)
  console.log('\n🚀 Deploying container...');
  const d = await api('POST', '/services/data/v62.0/tooling/sobjects/ContainerAsyncRequest', {
    MetadataContainerId: containerId,
    IsCheckOnly: false,
    IsAutoUpdateEnabled: false,
  });
  console.log('Deploy response:', d.status, JSON.stringify(d.data).slice(0, 300));

  if (d.data.id) {
    // Vänta på klar
    console.log('\n⏳ Väntar på deploy...');
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const s = await api('GET', '/services/data/v62.0/tooling/sobjects/ContainerAsyncRequest/' + d.data.id);
      console.log('  State: ' + s.data.State + ' | Done: ' + s.data.IsDone);
      if (s.data.IsDone) {
        console.log('\n=== Resultat ===');
        console.log('State:', s.data.State);
        console.log('Message:', s.data.Message);
        console.log('Components:', s.data.DeployDetails?.componentSuccesses?.length, 'successes,', s.data.DeployDetails?.componentFailures?.length, 'failures');
        if (s.data.DeployDetails?.componentFailures?.length > 0) {
          for (const f of s.data.DeployDetails.componentFailures) {
            console.log('  ❌ ' + f.FullName + ': ' + f.Problem);
          }
        }
        break;
      }
    }
  }

  // Verifiera
  console.log('\n=== Verifiering (via REST describe) ===');
  for (const o of OBJECTS) {
    const r = await api('GET', '/services/data/v62.0/sobjects/' + o.fullName + '/describe');
    if (r.status === 200) {
      console.log('  ✅ ' + o.fullName + ' synlig (' + r.data.fields.length + ' fields)');
    } else {
      console.log('  ❌ ' + o.fullName + ': ' + r.status);
    }
  }
}

main().catch(e => console.error('❌', e.message));
