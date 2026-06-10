/**
 * Salesforce schema setup — uses SOAP Metadata API (tested & working).
 * Creates ALL custom objects + fields for Hyrtoaletter project.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import { execSync } from 'child_process';
dotenv.config();

const INSTANCE_URL = process.env.SF_INSTANCE_URL;
const SID = process.env.SF_SESSION_ID;

function soapCall(bodyXml) {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader>
      <met:sessionId>${SID}</met:sessionId>
    </met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    ${bodyXml}
  </soapenv:Body>
</soapenv:Envelope>`;

  const tmpFile = `/tmp/sf_soap_${Date.now()}.xml`;
  fs.writeFileSync(tmpFile, envelope);

  const result = execSync(
    `curl -s -X POST -H "Content-Type: text/xml" -H "SOAPAction: dummy" -d @${tmpFile} "${INSTANCE_URL}/services/Soap/m/62.0"`,
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }
  );
  fs.unlinkSync(tmpFile);
  return result;
}

async function main() {
  console.log('🔧 Building Hyrtoaletter schema via SOAP Metadata API...\n');

  let created = 0, skipped = 0, failed = 0;

  // ── CREATE METADATA items ──
  const items = [];

  // 4 Custom Objects
  const objects = [
    { name: 'Hub__c', label: 'Hub', plural: 'Hubar', nameType: 'Text', desc: 'Logistiknav för leverans' },
    { name: 'Booking_Slot__c', label: 'Booking Slot', plural: 'Booking Slots', nameType: 'AutoNumber', nameFormat: 'BK-{000000}', desc: 'Bokningsslot' },
    { name: 'Addon_Product__c', label: 'Addon Product', plural: 'Addon Products', nameType: 'AutoNumber', nameFormat: 'AD-{000000}', desc: 'Tillval till bokning' },
    { name: 'Service_Log__c', label: 'Service Log', plural: 'Service Logs', nameType: 'AutoNumber', nameFormat: 'SL-{000000}', desc: 'Servicelogg för assets' },
  ];

  for (const obj of objects) {
    // CustomObject
    let nameFieldXml = `<met:label>${obj.label} Name</met:label><met:type>${obj.nameType}</met:type>`;
    if (obj.nameFormat) nameFieldXml += `<met:displayFormat>${obj.nameFormat}</met:displayFormat>`;

    items.push({
      label: `Object ${obj.name}`,
      xml: `
        <met:metadata xsi:type="met:CustomObject" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <met:fullName>${obj.name}</met:fullName>
          <met:label>${obj.label}</met:label>
          <met:pluralLabel>${obj.plural}</met:pluralLabel>
          <met:nameField>${nameFieldXml}</met:nameField>
          <met:description>${obj.desc}</met:description>
          <met:deploymentStatus>Deployed</met:deploymentStatus>
          <met:sharingModel>ReadWrite</met:sharingModel>
        </met:metadata>`,
    });
  }

  // Fields for Hub__c
  items.push(
    { label: 'Hub.Address__c', xml: fieldXml('Hub__c', 'Address__c', 'Address', 'TextArea', false) },
    { label: 'Hub.PostalCode__c', xml: fieldXml('Hub__c', 'PostalCode__c', 'Postal Code', 'Text', false) },
    { label: 'Hub.MaxDeliveryRadiusKm__c', xml: numberField('Hub__c', 'MaxDeliveryRadiusKm__c', 'Max Delivery Radius (km)', 0) },
    { label: 'Hub.MediumRadiusKm__c', xml: numberField('Hub__c', 'MediumRadiusKm__c', 'Medium Radius (km)', 0) },
    { label: 'Hub.FarRadiusKm__c', xml: numberField('Hub__c', 'FarRadiusKm__c', 'Far Radius (km)', 0) },
    { label: 'Hub.BaseDeliveryFee__c', xml: currencyField('Hub__c', 'BaseDeliveryFee__c', 'Base Delivery Fee') },
    { label: 'Hub.MediumDeliveryFee__c', xml: currencyField('Hub__c', 'MediumDeliveryFee__c', 'Medium Delivery Fee') },
    { label: 'Hub.FarDeliveryFee__c', xml: currencyField('Hub__c', 'FarDeliveryFee__c', 'Far Delivery Fee') },
    { label: 'Hub.IsActive__c', xml: `<met:metadata xsi:type="met:CustomField" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><met:fullName>Hub__c.IsActive__c</met:fullName><met:label>Is Active</met:label><met:type>Checkbox</met:type><met:defaultValue>true</met:defaultValue></met:metadata>` },
  );

  // Fields for Asset (standard object)
  items.push(
    { label: 'Asset.Hub__c', xml: lookupField('Asset', 'Hub__c', 'Hub', 'Hub__c') },
    { label: 'Asset.Location__c', xml: fieldXml('Asset', 'Location__c', 'Location', 'TextArea', false) },
    { label: 'Asset.Notes__c', xml: fieldXml('Asset', 'Notes__c', 'Notes', 'TextArea', false) },
  );

  // Fields for Booking_Slot__c
  items.push(
    { label: 'Booking_Slot.Asset__c', xml: lookupField('Booking_Slot__c', 'Asset__c', 'Asset', 'Asset', true) },
    { label: 'Booking_Slot.Hub__c', xml: lookupField('Booking_Slot__c', 'Hub__c', 'Hub', 'Hub__c') },
    { label: 'Booking_Slot.Opportunity__c', xml: lookupField('Booking_Slot__c', 'Opportunity__c', 'Opportunity', 'Opportunity') },
    { label: 'Booking_Slot.Contact__c', xml: lookupField('Booking_Slot__c', 'Contact__c', 'Contact', 'Contact') },
    { label: 'Booking_Slot.StartDateTime__c', xml: `<met:metadata xsi:type="met:CustomField" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><met:fullName>Booking_Slot__c.StartDateTime__c</met:fullName><met:label>Start Date/Time</met:label><met:type>DateTime</met:type><met:required>true</met:required></met:metadata>` },
    { label: 'Booking_Slot.EndDateTime__c', xml: `<met:metadata xsi:type="met:CustomField" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><met:fullName>Booking_Slot__c.EndDateTime__c</met:fullName><met:label>End Date/Time</met:label><met:type>DateTime</met:type><met:required>true</met:required></met:metadata>` },
    { label: 'Booking_Slot.Status__c', xml: picklistField('Booking_Slot__c', 'Status__c', 'Status', ['Pending','Confirmed','Delivered','Returned','Cancelled']) },
    { label: 'Booking_Slot.CustomerPostalCode__c', xml: fieldXml('Booking_Slot__c', 'CustomerPostalCode__c', 'Customer Postal Code', 'Text', false) },
    { label: 'Booking_Slot.DeliveryAddress__c', xml: fieldXml('Booking_Slot__c', 'DeliveryAddress__c', 'Delivery Address', 'TextArea', false) },
    { label: 'Booking_Slot.DeliveryNotes__c', xml: fieldXml('Booking_Slot__c', 'DeliveryNotes__c', 'Delivery Notes', 'TextArea', false) },
    { label: 'Booking_Slot.DeliveryDistanceKm__c', xml: numberField('Booking_Slot__c', 'DeliveryDistanceKm__c', 'Delivery Distance (km)', 1) },
    { label: 'Booking_Slot.DeliveryFee__c', xml: currencyField('Booking_Slot__c', 'DeliveryFee__c', 'Delivery Fee') },
    { label: 'Booking_Slot.BasePrice__c', xml: currencyField('Booking_Slot__c', 'BasePrice__c', 'Base Price') },
    { label: 'Booking_Slot.TotalPrice__c', xml: currencyField('Booking_Slot__c', 'TotalPrice__c', 'Total Price') },
  );

  // Fields for Addon_Product__c
  items.push(
    { label: 'Addon_Product.BookingSlot__c', xml: lookupField('Addon_Product__c', 'BookingSlot__c', 'Booking Slot', 'Booking_Slot__c', true) },
    { label: 'Addon_Product.Product__c', xml: lookupField('Addon_Product__c', 'Product__c', 'Product', 'Product2', true) },
    { label: 'Addon_Product.Quantity__c', xml: numberField('Addon_Product__c', 'Quantity__c', 'Quantity', 0) },
    { label: 'Addon_Product.UnitPrice__c', xml: currencyField('Addon_Product__c', 'UnitPrice__c', 'Unit Price') },
    { label: 'Addon_Product.TotalPrice__c', xml: currencyField('Addon_Product__c', 'TotalPrice__c', 'Total Price') },
  );

  // Fields for Service_Log__c
  items.push(
    { label: 'Service_Log.Asset__c', xml: lookupField('Service_Log__c', 'Asset__c', 'Asset', 'Asset') },
    { label: 'Service_Log.BookingSlot__c', xml: lookupField('Service_Log__c', 'BookingSlot__c', 'Booking Slot', 'Booking_Slot__c') },
    { label: 'Service_Log.ServiceType__c', xml: picklistField('Service_Log__c', 'ServiceType__c', 'Service Type', ['Cleaning','Repair','Inspection','Restock','Other']) },
    { label: 'Service_Log.ServiceDate__c', xml: `<met:metadata xsi:type="met:CustomField" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><met:fullName>Service_Log__c.ServiceDate__c</met:fullName><met:label>Service Date</met:label><met:type>Date</met:type></met:metadata>` },
    { label: 'Service_Log.Notes__c', xml: fieldXml('Service_Log__c', 'Notes__c', 'Notes', 'TextArea', false) },
    { label: 'Service_Log.PerformedBy__c', xml: fieldXml('Service_Log__c', 'PerformedBy__c', 'Performed By', 'Text', false) },
    { label: 'Service_Log.Cost__c', xml: currencyField('Service_Log__c', 'Cost__c', 'Cost') },
  );

  // Process all items
  for (const item of items) {
    const body = `
      <met:createMetadata>
        ${item.xml}
      </met:createMetadata>`;

    try {
      const result = soapCall(body);
      if (result.includes('<success>true</success>')) {
        created++;
        console.log(`  ✅ ${item.label}`);
      } else if (result.includes('duplicate') || result.includes('already exists')) {
        skipped++;
        console.log(`  ⏭️  ${item.label} (exists)`);
      } else {
        // Extract error message
        const errMatch = result.match(/<faultstring>([^<]+)<\/faultstring>/);
        const errMsg = errMatch ? errMatch[1] : result.slice(0, 150);
        failed++;
        console.log(`  ❌ ${item.label}: ${errMsg}`);
      }
    } catch (e) {
      failed++;
      console.log(`  ❌ ${item.label}: ${e.message}`);
    }
  }

  console.log(`\n📊 Result: ${created} created, ${skipped} skipped, ${failed} failed`);
  if (failed === 0) console.log('✅ Hyrtoaletter schema complete!');
}

// ── XML helpers ──
function fieldXml(obj, field, label, type, required) {
  const req = required ? '<met:required>true</met:required>' : '';
  let extra = '';
  if (type === 'Text') extra = `<met:length>255</met:length>`;
  if (type === 'TextArea') extra = `<met:length>500</met:length>`;
  return `<met:metadata xsi:type="met:CustomField" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><met:fullName>${obj}.${field}</met:fullName><met:label>${label}</met:label><met:type>${type}</met:type>${req}${extra}</met:metadata>`;
}

function numberField(obj, field, label, scale) {
  return `<met:metadata xsi:type="met:CustomField" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><met:fullName>${obj}.${field}</met:fullName><met:label>${label}</met:label><met:type>Number</met:type><met:precision>18</met:precision><met:scale>${scale}</met:scale></met:metadata>`;
}

function currencyField(obj, field, label) {
  return `<met:metadata xsi:type="met:CustomField" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><met:fullName>${obj}.${field}</met:fullName><met:label>${label}</met:label><met:type>Currency</met:type></met:metadata>`;
}

function lookupField(obj, field, label, refTo, required = false) {
  const req = required ? '<met:required>true</met:required>' : '';
  return `<met:metadata xsi:type="met:CustomField" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><met:fullName>${obj}.${field}</met:fullName><met:label>${label}</met:label><met:type>Lookup</met:type><met:referenceTo>${refTo}</met:referenceTo><met:relationshipName>${field.replace('__c','')}</met:relationshipName>${req}</met:metadata>`;
}

function picklistField(obj, field, label, values) {
  const vals = values.map(v => `<met:value><met:fullName>${v}</met:fullName><met:label>${v}</met:label><met:default>${v === values[0] ? 'true' : 'false'}</met:default></met:value>`).join('');
  return `<met:metadata xsi:type="met:CustomField" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><met:fullName>${obj}.${field}</met:fullName><met:label>${label}</met:label><met:type>Picklist</met:type><met:valueSet><met:valueSetDefinition><met:sorted>false</met:sorted>${vals}</met:valueSetDefinition></met:valueSet></met:metadata>`;
}

main().catch(console.error);
