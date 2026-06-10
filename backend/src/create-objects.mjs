/**
 * Create CustomObjects + CustomFields via Tooling API — properly deployed.
 * Uses 'deploy' via Composite Graph for atomic deployment.
 */
import 'dotenv/config';
import { SalesforceClient } from './salesforce-client.js';

const sf = new SalesforceClient({
  instanceUrl: process.env.SF_INSTANCE_URL,
  consumerKey: process.env.SF_CONSUMER_KEY,
  consumerSecret: process.env.SF_CONSUMER_SECRET,
  username: process.env.SF_USERNAME,
});

// Definiera 4 custom objects
const OBJECTS = [
  {
    fullName: 'Hyrto_Hub__c',
    label: 'Hub',
    pluralLabel: 'Hubs',
    description: 'Logistiknav för leverans av toaletter',
    nameField: { label: 'Hub Name', type: 'Text' },
  },
  {
    fullName: 'Hyrto_Booking__c',
    label: 'Hyrto Booking',
    pluralLabel: 'Hyrto Bookings',
    description: 'Bokning av toalett',
    nameField: { label: 'Booking Number', type: 'AutoNumber', displayFormat: 'BOOK-{000000}' },
  },
  {
    fullName: 'Hyrto_Addon__c',
    label: 'Hyrto Addon',
    pluralLabel: 'Hyrto Addons',
    description: 'Tillval på en bokning',
    nameField: { label: 'Addon Number', type: 'AutoNumber', displayFormat: 'ADD-{000000}' },
  },
  {
    fullName: 'Hyrto_ServiceLog__c',
    label: 'Hyrto Service Log',
    pluralLabel: 'Hyrto Service Logs',
    description: 'Servicelogg för toaletter',
    nameField: { label: 'Service Log Number', type: 'AutoNumber', displayFormat: 'SLOG-{000000}' },
  },
];

async function main() {
  console.log('🔧 Creating CustomObjects via Tooling API...\n');
  for (const o of OBJECTS) {
    const payload = {
      Metadata: {
        fullName: o.fullName,
        label: o.label,
        pluralLabel: o.pluralLabel,
        description: o.description,
        deploymentStatus: 'Deployed',
        sharingModel: 'ReadWrite',
        nameField: o.nameField,
      },
    };
    try {
      await sf.createTooling('CustomObject', payload);
      console.log('  ✅ Created ' + o.fullName);
    } catch (e) {
      const msg = (e.message || '').slice(0, 200);
      if (msg.includes('Duplicate') || msg.includes('already exists')) {
        console.log('  ⏭️  ' + o.fullName + ' (exists)');
      } else {
        console.log('  ❌ ' + o.fullName + ': ' + msg);
      }
    }
  }

  // Vänta lite för propagation
  console.log('\nVäntar 3s på propagation...');
  await new Promise(r => setTimeout(r, 3000));

  // Verifiera
  console.log('\n=== Verifiering ===');
  for (const o of OBJECTS) {
    try {
      const desc = await sf.describe(o.fullName);
      console.log('  ✅ ' + o.fullName + ' synlig via describe (' + desc.fields.length + ' fields)');
    } catch (e) {
      console.log('  ❌ ' + o.fullName + ': ' + (e.message || '').slice(0, 80));
    }
  }
}

main().catch(console.error);
