// Salesforce Setup Script — skapar hela datamodellen via Tooling API
// Kör: npx tsx scripts/setup-salesforce.ts

import jsforce from 'jsforce';

const SF_USERNAME = process.env.SF_USERNAME!;
const SF_PASSWORD = process.env.SF_PASSWORD!;
const SF_TOKEN = process.env.SF_SECURITY_TOKEN!;

async function main() {
  const conn = new jsforce.Connection({
    loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
  });

  console.log('Loggar in...');
  await conn.login(SF_USERNAME, SF_PASSWORD + SF_TOKEN);
  console.log('Inloggad som:', conn.userInfo?.username);

  const metadataUrl = `${conn.instanceUrl}/services/data/v62.0/tooling/sobjects`;

  // ========== Booking_Slot__c ==========
  console.log('\nSkapar Booking_Slot__c...');
  try {
    await conn.requestPost(`${metadataUrl}/CustomObject`, {
      FullName: 'Booking_Slot__c',
      Metadata: {
        label: 'Bokning',
        pluralLabel: 'Bokningar',
        nameField: { type: 'AutoNumber', displayFormat: 'BOOK-{00000}', label: 'Bokningsnummer' },
        deploymentStatus: 'Deployed',
        sharingModel: 'ReadWrite',
      },
    });
    console.log('OK Booking_Slot__c');
  } catch (e: any) {
    console.log(e.errorCode === 'DUPLICATE_VALUE' ? 'Finns redan' : 'Fel: ' + e.message?.substring(0, 150));
  }

  // Fält för Booking_Slot__c
  console.log('\nFält för Booking_Slot__c:');
  const bFields = [
    { name: 'Asset__c', meta: { label: 'Toalett (Asset)', type: 'Lookup', relationshipName: 'BookingSlots', referenceTo: 'Asset', required: true } },
    { name: 'Opportunity__c', meta: { label: 'Affärsmöjlighet', type: 'Lookup', relationshipName: 'BookingSlotsOpp', referenceTo: 'Opportunity', required: false } },
    { name: 'Contact__c', meta: { label: 'Kontaktperson', type: 'Lookup', relationshipName: 'BookingSlotsContact', referenceTo: 'Contact', required: false } },
    { name: 'StartDateTime__c', meta: { label: 'Startdatum/tid', type: 'DateTime', required: true } },
    { name: 'EndDateTime__c', meta: { label: 'Slutdatum/tid', type: 'DateTime', required: true } },
    { name: 'Status__c', meta: { label: 'Status', type: 'Picklist', required: true, valueSet: { valueSetDefinition: { sorted: false, value: [{ fullName: 'Bokad', label: 'Bokad', default: true }, { fullName: 'Bekräftad', label: 'Bekräftad' }, { fullName: 'Utkörd', label: 'Utkörd' }, { fullName: 'Återlämnad', label: 'Återlämnad' }, { fullName: 'Avbokad', label: 'Avbokad' }] } } } },
    { name: 'DeliveryAddress__c', meta: { label: 'Leveransadress', type: 'TextArea', required: false } },
    { name: 'DeliveryNotes__c', meta: { label: 'Leveransnoteringar', type: 'LongTextArea', required: false, visibleLines: 3 } },
    { name: 'BasePrice__c', meta: { label: 'Grundpris', type: 'Currency', required: false, precision: 18, scale: 2 } },
    { name: 'TotalPrice__c', meta: { label: 'Totalpris', type: 'Currency', required: false, precision: 18, scale: 2 } },
  ];

  for (const f of bFields) {
    try {
      await conn.requestPost(`${metadataUrl}/CustomField`, { FullName: `Booking_Slot__c.${f.name}`, Metadata: f.meta });
      console.log(`  OK ${f.name}`);
    } catch (e: any) {
      console.log(`  ${e.errorCode === 'DUPLICATE_VALUE' ? 'Finns' : 'Fel'}: ${f.name}`);
    }
  }

  // ========== Addon_Product__c ==========
  console.log('\nSkapar Addon_Product__c...');
  try {
    await conn.requestPost(`${metadataUrl}/CustomObject`, {
      FullName: 'Addon_Product__c',
      Metadata: {
        label: 'Tillval', pluralLabel: 'Tillval',
        nameField: { type: 'AutoNumber', displayFormat: 'ADD-{00000}', label: 'Tillvalsnummer' },
        deploymentStatus: 'Deployed', sharingModel: 'ReadWrite',
      },
    });
    console.log('OK');
  } catch (e: any) { console.log(e.errorCode === 'DUPLICATE_VALUE' ? 'Finns redan' : 'Fel: ' + e.message?.substring(0, 150)); }

  const aFields = [
    { name: 'BookingSlot__c', meta: { label: 'Bokning', type: 'MasterDetail', relationshipName: 'Addons', referenceTo: 'Booking_Slot__c', required: true } },
    { name: 'Product__c', meta: { label: 'Produkt', type: 'Lookup', relationshipName: 'AddonsProduct', referenceTo: 'Product2', required: true } },
    { name: 'Quantity__c', meta: { label: 'Antal', type: 'Number', required: true, precision: 3, scale: 0, defaultValue: 1 } },
    { name: 'UnitPrice__c', meta: { label: 'À-pris', type: 'Currency', required: false, precision: 18, scale: 2 } },
    { name: 'TotalPrice__c', meta: { label: 'Totalpris', type: 'Currency', required: false, precision: 18, scale: 2 } },
  ];
  for (const f of aFields) {
    try {
      await conn.requestPost(`${metadataUrl}/CustomField`, { FullName: `Addon_Product__c.${f.name}`, Metadata: f.meta });
      console.log(`  OK ${f.name}`);
    } catch (e: any) { console.log(`  ${e.errorCode === 'DUPLICATE_VALUE' ? 'Finns' : 'Fel'}: ${f.name}`); }
  }

  // ========== Service_Log__c ==========
  console.log('\nSkapar Service_Log__c...');
  try {
    await conn.requestPost(`${metadataUrl}/CustomObject`, {
      FullName: 'Service_Log__c',
      Metadata: {
        label: 'Servicelogg', pluralLabel: 'Serviceloggar',
        nameField: { type: 'AutoNumber', displayFormat: 'SVC-{00000}', label: 'Service-ID' },
        deploymentStatus: 'Deployed', sharingModel: 'ReadWrite',
      },
    });
    console.log('OK');
  } catch (e: any) { console.log(e.errorCode === 'DUPLICATE_VALUE' ? 'Finns redan' : 'Fel: ' + e.message?.substring(0, 150)); }

  const sFields = [
    { name: 'Asset__c', meta: { label: 'Toalett (Asset)', type: 'Lookup', relationshipName: 'ServiceLogsAsset', referenceTo: 'Asset', required: true } },
    { name: 'BookingSlot__c', meta: { label: 'Bokning', type: 'Lookup', relationshipName: 'ServiceLogsBooking', referenceTo: 'Booking_Slot__c', required: false } },
    { name: 'ServiceType__c', meta: { label: 'Servicetyp', type: 'Picklist', required: true, valueSet: { valueSetDefinition: { sorted: false, value: [{ fullName: 'Rengöring', label: 'Rengöring', default: true }, { fullName: 'Reparation', label: 'Reparation' }, { fullName: 'Tömning', label: 'Tömning' }, { fullName: 'Inspektion', label: 'Inspektion' }] } } } },
    { name: 'ServiceDate__c', meta: { label: 'Servicedatum', type: 'Date', required: true } },
    { name: 'Notes__c', meta: { label: 'Anteckningar', type: 'LongTextArea', required: false, visibleLines: 3 } },
    { name: 'PerformedBy__c', meta: { label: 'Utförd av', type: 'Text', required: false, length: 100 } },
    { name: 'Cost__c', meta: { label: 'Kostnad', type: 'Currency', required: false, precision: 18, scale: 2 } },
  ];
  for (const f of sFields) {
    try {
      await conn.requestPost(`${metadataUrl}/CustomField`, { FullName: `Service_Log__c.${f.name}`, Metadata: f.meta });
      console.log(`  OK ${f.name}`);
    } catch (e: any) { console.log(`  ${e.errorCode === 'DUPLICATE_VALUE' ? 'Finns' : 'Fel'}: ${f.name}`); }
  }

  // ========== Asset-fält ==========
  console.log('\nLägger till fält på Asset...');
  const assetFields = [
    { name: 'Asset.Location__c', meta: { label: 'Plats', type: 'Text', required: false, length: 255 } },
    { name: 'Asset.Notes__c', meta: { label: 'Anteckningar', type: 'LongTextArea', required: false, visibleLines: 3 } },
  ];
  for (const f of assetFields) {
    try {
      await conn.requestPost(`${metadataUrl}/CustomField`, { FullName: f.name, Metadata: f.meta });
      console.log(`  OK ${f.name}`);
    } catch (e: any) { console.log(`  ${e.errorCode === 'DUPLICATE_VALUE' ? 'Finns' : 'Fel'}: ${f.name}`); }
  }

  console.log('\nKlart! Alla objekt och fält är skapade.');
}

main().catch((e) => {
  console.error('Fatalt:', e.message || e);
  process.exit(1);
});
