/**
 * Push ALL fields via Tooling API. Try create, ignore "already exists" errors.
 */
import 'dotenv/config';
import { SalesforceClient } from './salesforce-client.js';

const sf = new SalesforceClient({
  instanceUrl: process.env.SF_INSTANCE_URL,
  consumerKey: process.env.SF_CONSUMER_KEY,
  consumerSecret: process.env.SF_CONSUMER_SECRET,
  username: process.env.SF_USERNAME,
});

const FIELDS = [
  // Hub__c
  { obj: 'Hub__c', fullName: 'Hub__c.Address__c', label: 'Address', type: 'LongTextArea', length: 32768, visibleLines: 5 },
  { obj: 'Hub__c', fullName: 'Hub__c.PostalCode__c', label: 'Postal Code', type: 'Text', length: 20 },
  { obj: 'Hub__c', fullName: 'Hub__c.MaxDeliveryRadiusKm__c', label: 'Max Delivery Radius (km)', type: 'Number', precision: 18, scale: 0 },
  { obj: 'Hub__c', fullName: 'Hub__c.MediumRadiusKm__c', label: 'Medium Radius (km)', type: 'Number', precision: 18, scale: 0 },
  { obj: 'Hub__c', fullName: 'Hub__c.FarRadiusKm__c', label: 'Far Radius (km)', type: 'Number', precision: 18, scale: 0 },
  { obj: 'Hub__c', fullName: 'Hub__c.BaseDeliveryFee__c', label: 'Base Delivery Fee', type: 'Currency', precision: 16, scale: 2 },
  { obj: 'Hub__c', fullName: 'Hub__c.MediumDeliveryFee__c', label: 'Medium Delivery Fee', type: 'Currency', precision: 16, scale: 2 },
  { obj: 'Hub__c', fullName: 'Hub__c.FarDeliveryFee__c', label: 'Far Delivery Fee', type: 'Currency', precision: 16, scale: 2 },
  { obj: 'Hub__c', fullName: 'Hub__c.IsActive__c', label: 'Is Active', type: 'Checkbox', defaultValue: 'true' },

  // Asset
  { obj: 'Asset', fullName: 'Asset.Hub__c', label: 'Hub', type: 'Lookup', referenceTo: 'Hub__c', relationshipName: 'Asset_Hub' },
  { obj: 'Asset', fullName: 'Asset.Location__c', label: 'Location', type: 'LongTextArea', length: 32768, visibleLines: 3 },
  { obj: 'Asset', fullName: 'Asset.Notes__c', label: 'Notes', type: 'LongTextArea', length: 32768, visibleLines: 3 },

  // Booking_Slot__c
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Hub__c', label: 'Hub', type: 'Lookup', referenceTo: 'Hub__c', relationshipName: 'Booking_Hub' },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Opportunity__c', label: 'Opportunity', type: 'Lookup', referenceTo: 'Opportunity', relationshipName: 'Booking_Opp' },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Contact__c', label: 'Contact', type: 'Lookup', referenceTo: 'Contact', relationshipName: 'Booking_Contact' },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Status__c', label: 'Status', type: 'Picklist', picklistValues: ['Pending','Confirmed','Delivered','Returned','Cancelled'] },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.CustomerPostalCode__c', label: 'Customer Postal Code', type: 'Text', length: 20 },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.DeliveryAddress__c', label: 'Delivery Address', type: 'LongTextArea', length: 32768, visibleLines: 3 },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.DeliveryNotes__c', label: 'Delivery Notes', type: 'LongTextArea', length: 32768, visibleLines: 3 },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.DeliveryDistanceKm__c', label: 'Delivery Distance (km)', type: 'Number', precision: 18, scale: 1 },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.DeliveryFee__c', label: 'Delivery Fee', type: 'Currency', precision: 16, scale: 2 },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.BasePrice__c', label: 'Base Price', type: 'Currency', precision: 16, scale: 2 },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.TotalPrice__c', label: 'Total Price', type: 'Currency', precision: 16, scale: 2 },

  // Addon_Product__c
  { obj: 'Addon_Product__c', fullName: 'Addon_Product__c.Product__c', label: 'Product', type: 'Lookup', referenceTo: 'Product2', relationshipName: 'Addon_Product2', required: true },
  { obj: 'Addon_Product__c', fullName: 'Addon_Product__c.Quantity__c', label: 'Quantity', type: 'Number', precision: 18, scale: 0, defaultValue: 1 },
  { obj: 'Addon_Product__c', fullName: 'Addon_Product__c.UnitPrice__c', label: 'Unit Price', type: 'Currency', precision: 16, scale: 2 },
  { obj: 'Addon_Product__c', fullName: 'Addon_Product__c.TotalPrice__c', label: 'Total Price', type: 'Currency', precision: 16, scale: 2 },

  // Service_Log__c
  { obj: 'Service_Log__c', fullName: 'Service_Log__c.Asset__c', label: 'Asset', type: 'Lookup', referenceTo: 'Asset', relationshipName: 'SvcLog_Asset' },
  { obj: 'Service_Log__c', fullName: 'Service_Log__c.BookingSlot__c', label: 'Booking Slot', type: 'Lookup', referenceTo: 'Booking_Slot__c', relationshipName: 'SvcLog_Booking' },
  { obj: 'Service_Log__c', fullName: 'Service_Log__c.ServiceType__c', label: 'Service Type', type: 'Picklist', picklistValues: ['Cleaning','Repair','Inspection','Restock','Other'] },
  { obj: 'Service_Log__c', fullName: 'Service_Log__c.ServiceDate__c', label: 'Service Date', type: 'Date' },
  { obj: 'Service_Log__c', fullName: 'Service_Log__c.Notes__c', label: 'Notes', type: 'LongTextArea', length: 32768, visibleLines: 3 },
  { obj: 'Service_Log__c', fullName: 'Service_Log__c.PerformedBy__c', label: 'Performed By', type: 'Text', length: 100 },
  { obj: 'Service_Log__c', fullName: 'Service_Log__c.Cost__c', label: 'Cost', type: 'Currency', precision: 16, scale: 2 },
];

function buildPayload(f) {
  const md = {
    fullName: f.fullName,
    label: f.label,
    type: f.type,
    required: f.required || false,
  };
  if (f.length) md.length = f.length;
  if (f.visibleLines) md.visibleLines = f.visibleLines;
  if (f.precision) md.precision = f.precision;
  if (f.scale !== undefined) md.scale = f.scale;
  if (f.defaultValue !== undefined) {
    md.defaultValue = f.type === 'Checkbox' ? String(f.defaultValue) : f.defaultValue;
  }
  if (f.referenceTo) {
    md.referenceTo = f.referenceTo;
    md.relationshipName = f.relationshipName || f.fullName.split('.').pop().replace('__c', '');
  }
  if (f.picklistValues) {
    md.valueSet = {
      valueSetDefinition: {
        sorted: false,
        value: f.picklistValues.map((v, i) => ({
          fullName: v,
          label: v,
          default: i === 0,
        })),
      },
    };
  }
  return { FullName: f.fullName, Metadata: md };
}

async function main() {
  console.log('🔧 Pushing fields via Tooling API...\n');
  let created = 0, exists = 0, failed = 0;

  for (const f of FIELDS) {
    const payload = buildPayload(f);
    try {
      await sf.createTooling('CustomField', payload);
      created++;
      console.log(`  ✅ ${f.fullName}`);
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('Duplicate') || msg.includes('already exists') || msg.includes('DUPLICATE_DEVELOPER_NAME')) {
        exists++;
        console.log(`  ⏭️  ${f.fullName} (exists)`);
      } else {
        failed++;
        const short = msg.slice(0, 200).replace(/\n/g, ' ');
        console.log(`  ❌ ${f.fullName}: ${short}`);
      }
    }
  }

  console.log(`\n📊 ${created} created, ${exists} exists, ${failed} failed`);
  if (failed === 0) console.log('✅ All fields in place!');
}

main().catch(console.error);
