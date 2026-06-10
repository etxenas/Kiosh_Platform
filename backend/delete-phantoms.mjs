/**
 * Radera ALLA phantom custom fields från orgen.
 * Phantom = custom field med TableEnumOrId som börjar med 01I (placeholder EntityDefinition).
 */
import dotenv from 'dotenv';
import { SalesforceClient } from './src/salesforce-client.js';

dotenv.config();
const sf = new SalesforceClient({
  instanceUrl: process.env.SF_INSTANCE_URL,
  consumerKey: process.env.SF_CONSUMER_KEY,
  consumerSecret: process.env.SF_CONSUMER_SECRET,
  username: process.env.SF_USERNAME,
  apiVersion: '62.0',
});

const { records: allFields } = await sf.queryTooling(
  "SELECT Id, DeveloperName, TableEnumOrId FROM CustomField WHERE DeveloperName != null ORDER BY DeveloperName"
);

const phantoms = allFields.filter(f => f.TableEnumOrId && f.TableEnumOrId.startsWith('01I'));

console.log(`\n🔍 ${phantoms.length} phantom fields found. Deleting...\n`);

let deleted = 0;
let errors = 0;

for (const field of phantoms) {
  try {
    // Använd Tooling API DELETE
    const url = `${sf.instanceUrl}/services/data/v${process.env.SF_API_VERSION || '62.0'}/tooling/sobjects/CustomField/${field.Id}`;
    const token = await sf._getToken();
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      deleted++;
      console.log(`  ✅ ${field.DeveloperName} (${field.Id})`);
    } else {
      const body = await res.text();
      errors++;
      console.log(`  ❌ ${field.DeveloperName}: ${body.slice(0, 200)}`);
    }
  } catch (e) {
    errors++;
    console.log(`  ❌ ${field.DeveloperName}: ${e.message.slice(0, 200)}`);
  }
}

console.log(`\n${deleted} deleted, ${errors} errors\n`);
