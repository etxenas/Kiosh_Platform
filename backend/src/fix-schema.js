#!/usr/bin/env node
/**
 * Fix/retry failed schema elements.
 * Lessons: LongTextArea not TextArea, Currency needs precision+scale,
 * Lookup needs unique relationshipName (different from fieldName).
 */
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import fs from 'fs';
dotenv.config();

const INSTANCE_URL = process.env.SF_INSTANCE_URL;
const SID = process.env.SF_SESSION_ID;

function soap(bodyXml) {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Header><met:SessionHeader><met:sessionId>${SID}</met:sessionId></met:SessionHeader></soapenv:Header>
  <soapenv:Body>${bodyXml}</soapenv:Body>
</soapenv:Envelope>`;
  const f = `/tmp/sf_fix_${Date.now()}.xml`;
  fs.writeFileSync(f, envelope);
  try {
    const out = execSync(`curl -s -m 10 -X POST -H "Content-Type: text/xml" -H "SOAPAction: x" -d @${f} "${INSTANCE_URL}/services/Soap/m/62.0"`, { encoding: 'utf8', maxBuffer: 1024*1024 });
    return out;
  } finally { fs.unlinkSync(f); }
}

// ── Alla items att fixa ──
const items = [
  // TextAreas → LongTextArea
  { label:'Hub.Address__c', body: fixTextArea('Hub__c','Address__c','Address') },
  { label:'Asset.Location__c', body: fixTextArea('Asset','Location__c','Location') },
  { label:'Asset.Notes__c', body: fixTextArea('Asset','Notes__c','Notes') },
  { label:'Booking_Slot.DeliveryAddress__c', body: fixTextArea('Booking_Slot__c','DeliveryAddress__c','Delivery Address') },
  { label:'Booking_Slot.DeliveryNotes__c', body: fixTextArea('Booking_Slot__c','DeliveryNotes__c','Delivery Notes') },
  { label:'Service_Log.Notes__c', body: fixTextArea('Service_Log__c','Notes__c','Notes') },

  // Currencies (need precision+scale)
  { label:'Hub.BaseDeliveryFee__c', body: fixCurrency('Hub__c','BaseDeliveryFee__c','Base Delivery Fee') },
  { label:'Hub.MediumDeliveryFee__c', body: fixCurrency('Hub__c','MediumDeliveryFee__c','Medium Delivery Fee') },
  { label:'Hub.FarDeliveryFee__c', body: fixCurrency('Hub__c','FarDeliveryFee__c','Far Delivery Fee') },
  { label:'Booking_Slot.DeliveryFee__c', body: fixCurrency('Booking_Slot__c','DeliveryFee__c','Delivery Fee') },
  { label:'Booking_Slot.BasePrice__c', body: fixCurrency('Booking_Slot__c','BasePrice__c','Base Price') },
  { label:'Booking_Slot.TotalPrice__c', body: fixCurrency('Booking_Slot__c','TotalPrice__c','Total Price') },
  { label:'Addon_Product.UnitPrice__c', body: fixCurrency('Addon_Product__c','UnitPrice__c','Unit Price') },
  { label:'Addon_Product.TotalPrice__c', body: fixCurrency('Addon_Product__c','TotalPrice__c','Total Price') },
  { label:'Service_Log.Cost__c', body: fixCurrency('Service_Log__c','Cost__c','Cost') },

  // Lookups (unique relationshipName needed)
  { label:'Booking_Slot.Asset__c', body: fixLookup('Booking_Slot__c','Asset__c','Asset','Asset','BookingSlotToAsset', true) },
  { label:'Booking_Slot.Hub__c', body: fixLookup('Booking_Slot__c','Hub__c','Hub','Hub__c','BookingSlotToHub') },
  { label:'Addon_Product.BookingSlot__c', body: fixLookup('Addon_Product__c','BookingSlot__c','Booking Slot','Booking_Slot__c','AddonToBookingSlot', true) },
  { label:'Addon_Product.Product__c', body: fixLookup('Addon_Product__c','Product__c','Product','Product2','AddonToProduct', true) },
];

async function main() {
  console.log('🔧 Fixing remaining fields...\n');
  let ok=0, fail=0;
  for (const item of items) {
    try {
      const r = soap(item.body);
      if (r.includes('<success>true')) { ok++; console.log(`  ✅ ${item.label}`); }
      else if (r.includes('duplicate')||r.includes('already exists')||r.includes('Cannot create')) {
        ok++;
        console.log(`  ⏭️  ${item.label} (exists)`);
      }
      else {
        const m = r.match(/<faultstring>([^<]+)/);
        fail++; console.log(`  ❌ ${item.label}: ${m ? m[1] : r.slice(0,120)}`);
      }
    } catch(e) { fail++; console.log(`  ❌ ${item.label}: ${e.message}`); }
  }
  console.log(`\n📊 Fix: ${ok} ok, ${fail} failed`);
}

// ── Helpers ──
function fixTextArea(obj, field, label) {
  return `<met:createMetadata><met:metadata xsi:type="met:CustomField"><met:fullName>${obj}.${field}</met:fullName><met:label>${label}</met:label><met:type>LongTextArea</met:type><met:length>32768</met:length><met:visibleLines>5</met:visibleLines></met:metadata></met:createMetadata>`;
}
function fixCurrency(obj, field, label) {
  return `<met:createMetadata><met:metadata xsi:type="met:CustomField"><met:fullName>${obj}.${field}</met:fullName><met:label>${label}</met:label><met:type>Currency</met:type><met:precision>16</met:precision><met:scale>2</met:scale></met:metadata></met:createMetadata>`;
}
function fixLookup(obj, field, label, refTo, relName, req=false) {
  const r = req ? '<met:required>true</met:required>' : '';
  return `<met:createMetadata><met:metadata xsi:type="met:CustomField"><met:fullName>${obj}.${field}</met:fullName><met:label>${label}</met:label><met:type>Lookup</met:type><met:referenceTo>${refTo}</met:referenceTo><met:relationshipName>${relName}</met:relationshipName>${r}<met:deleteConstraint>SetNull</met:deleteConstraint></met:metadata></met:createMetadata>`;
}

main().catch(console.error);
