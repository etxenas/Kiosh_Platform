/**
 * Deploy Hyrtoaletter fields with NEW names (avoid ghost field names).
 * Prefix: Hyrto_ — unik, ingen krock med spökfält.
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
  // ── Hub__c (Hyrto_ prefix) ──
  { obj: 'Hub__c', fullName: 'Hub__c.Hyrto_Address__c', label: 'Address', type: 'LongTextArea', length: 32768, visibleLines: 5 },
  { obj: 'Hub__c', fullName: 'Hub__c.Hyrto_PostalCode__c', label: 'Postal Code', type: 'Text', length: 20 },
  { obj: 'Hub__c', fullName: 'Hub__c.Hyrto_MaxRadiusKm__c', label: 'Max Delivery Radius (km)', type: 'Number', precision: 18, scale: 0 },
  { obj: 'Hub__c', fullName: 'Hub__c.Hyrto_MediumRadiusKm__c', label: 'Medium Radius (km)', type: 'Number', precision: 18, scale: 0 },
  { obj: 'Hub__c', fullName: 'Hub__c.Hyrto_FarRadiusKm__c', label: 'Far Radius (km)', type: 'Number', precision: 18, scale: 0 },
  { obj: 'Hub__c', fullName: 'Hub__c.Hyrto_BaseFee__c', label: 'Base Delivery Fee', type: 'Currency', precision: 16, scale: 2 },
  { obj: 'Hub__c', fullName: 'Hub__c.Hyrto_MediumFee__c', label: 'Medium Delivery Fee', type: 'Currency', precision: 16, scale: 2 },
  { obj: 'Hub__c', fullName: 'Hub__c.Hyrto_FarFee__c', label: 'Far Delivery Fee', type: 'Currency', precision: 16, scale: 2 },
  { obj: 'Hub__c', fullName: 'Hub__c.Hyrto_IsActive__c', label: 'Is Active', type: 'Checkbox', defaultValue: 'true' },

  // ── Asset ──
  { obj: 'Asset', fullName: 'Asset.Hyrto_Hub__c', label: 'Hub', type: 'Lookup', referenceTo: 'Hub__c', relationshipName: 'Hyrto_Hub' },
  { obj: 'Asset', fullName: 'Asset.Hyrto_Location__c', label: 'Location', type: 'LongTextArea', length: 32768, visibleLines: 3 },
  { obj: 'Asset', fullName: 'Asset.Hyrto_Notes__c', label: 'Notes', type: 'LongTextArea', length: 32768, visibleLines: 3 },
  { obj: 'Asset', fullName: 'Asset.Hyrto_Model__c', label: 'Model', type: 'Picklist', picklistValues: ['Standard', 'Premium', 'Lyx', 'Handikappanpassad', 'Barnvänlig'] },
  { obj: 'Asset', fullName: 'Asset.Hyrto_SerialNumber__c', label: 'Serial Number', type: 'Text', length: 50 },

  // ── Booking_Slot__c ──
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Hyrto_Hub__c', label: 'Hub', type: 'Lookup', referenceTo: 'Hub__c', relationshipName: 'Hyrto_BookingHub' },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Hyrto_Status__c', label: 'Status', type: 'Picklist', picklistValues: ['Bokad','Bekräftad','Levererad','Återlämnad','Avbokad'] },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Hyrto_CustomerPostalCode__c', label: 'Customer Postal Code', type: 'Text', length: 20 },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Hyrto_DeliveryAddress__c', label: 'Delivery Address', type: 'LongTextArea', length: 32768, visibleLines: 3 },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Hyrto_DeliveryNotes__c', label: 'Delivery Notes', type: 'LongTextArea', length: 32768, visibleLines: 3 },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Hyrto_DistanceKm__c', label: 'Delivery Distance (km)', type: 'Number', precision: 18, scale: 1 },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Hyrto_DeliveryFee__c', label: 'Delivery Fee', type: 'Currency', precision: 16, scale: 2 },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Hyrto_BasePrice__c', label: 'Base Price', type: 'Currency', precision: 16, scale: 2 },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Hyrto_TotalPrice__c', label: 'Total Price', type: 'Currency', precision: 16, scale: 2 },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Hyrto_CustomerName__c', label: 'Customer Name', type: 'Text', length: 100 },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Hyrto_CustomerEmail__c', label: 'Customer Email', type: 'Email' },
  { obj: 'Booking_Slot__c', fullName: 'Booking_Slot__c.Hyrto_CustomerPhone__c', label: 'Customer Phone', type: 'Phone' },

  // ── Addon_Product__c ──
  { obj: 'Addon_Product__c', fullName: 'Addon_Product__c.Hyrto_Quantity__c', label: 'Quantity', type: 'Number', precision: 18, scale: 0, defaultValue: 1 },
  { obj: 'Addon_Product__c', fullName: 'Addon_Product__c.Hyrto_UnitPrice__c', label: 'Unit Price', type: 'Currency', precision: 16, scale: 2 },
  { obj: 'Addon_Product__c', fullName: 'Addon_Product__c.Hyrto_TotalPrice__c', label: 'Total Price', type: 'Currency', precision: 16, scale: 2 },

  // ── Service_Log__c ──
  { obj: 'Service_Log__c', fullName: 'Service_Log__c.Hyrto_ServiceType__c', label: 'Service Type', type: 'Picklist', picklistValues: ['Cleaning','Repair','Inspection','Restock','Other'] },
  { obj: 'Service_Log__c', fullName: 'Service_Log__c.Hyrto_ServiceDate__c', label: 'Service Date', type: 'Date' },
  { obj: 'Service_Log__c', fullName: 'Service_Log__c.Hyrto_Notes__c', label: 'Notes', type: 'LongTextArea', length: 32768, visibleLines: 3 },
  { obj: 'Service_Log__c', fullName: 'Service_Log__c.Hyrto_PerformedBy__c', label: 'Performed By', type: 'Text', length: 100 },
  { obj: 'Service_Log__c', fullName: 'Service_Log__c.Hyrto_Cost__c', label: 'Cost', type: 'Currency', precision: 16, scale: 2 },
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
    md.relationshipName = f.relationshipName;
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
  console.log('🔧 Deploying Hyrto_ fields...\n');
  let created = 0, exists = 0, failed = 0;
  for (const f of FIELDS) {
    const payload = buildPayload(f);
    try {
      await sf.createTooling('CustomField', payload);
      created++;
      console.log(`  ✅ ${f.fullName} (${f.type})`);
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
}

main().catch(console.error);
