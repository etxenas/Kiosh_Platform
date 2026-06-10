#!/usr/bin/env node
/**
 * Final approach: create fields directly via REST Tooling API.
 * We already know the objects exist. Now add each field one-by-one.
 */
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import fs from 'fs';
dotenv.config();

const INSTANCE_URL = process.env.SF_INSTANCE_URL;
const SID = process.env.SF_SESSION_ID;

async function api(method, path, body) {
  const opts = body ? ['-d', JSON.stringify(body)] : [];
  const cmd = ['curl', '-s', '-X', method, '-H', `Authorization: Bearer ${SID}`, '-H', 'Content-Type: application/json', ...opts, `${INSTANCE_URL}${path}`];
  const res = execSync(cmd.join(' '), { encoding: 'utf8', maxBuffer: 1024*1024 });
  return JSON.parse(res || '{}');
}

async function createField(table, devName, label, type, extra = {}) {
  const body = {
    DeveloperName: devName,
    TableEnumOrId: table,
    Metadata: { label, type, ...extra },
  };
  try {
    const res = await api('POST', '/services/data/v62.0/tooling/sobjects/CustomField', body);
    return { success: Array.isArray(res) ? false : res.success !== false, errors: Array.isArray(res) ? res : [] };
  } catch (e) { return { success: false, errors: [{ message: e.message }] }; }
}

const fields = [
  // Hub__c
  { table:'Hub__c', dev:'Address', label:'Address', type:'LongTextArea', extra:{length:32768,visibleLines:5} },
  { table:'Hub__c', dev:'PostalCode', label:'Postal Code', type:'Text', extra:{length:10} },
  { table:'Hub__c', dev:'MaxDeliveryRadiusKm', label:'Max Delivery Radius (km)', type:'Number', extra:{precision:18,scale:0} },
  { table:'Hub__c', dev:'MediumRadiusKm', label:'Medium Radius (km)', type:'Number', extra:{precision:18,scale:0} },
  { table:'Hub__c', dev:'FarRadiusKm', label:'Far Radius (km)', type:'Number', extra:{precision:18,scale:0} },
  { table:'Hub__c', dev:'BaseDeliveryFee', label:'Base Delivery Fee', type:'Currency', extra:{precision:16,scale:2} },
  { table:'Hub__c', dev:'MediumDeliveryFee', label:'Medium Delivery Fee', type:'Currency', extra:{precision:16,scale:2} },
  { table:'Hub__c', dev:'FarDeliveryFee', label:'Far Delivery Fee', type:'Currency', extra:{precision:16,scale:2} },
  { table:'Hub__c', dev:'IsActive', label:'Is Active', type:'Checkbox', extra:{defaultValue:true} },

  // Asset custom
  { table:'Asset', dev:'Hub', label:'Hub', type:'Lookup', extra:{referenceTo:'Hub__c',relationshipName:'AssetHub2'} },
  { table:'Asset', dev:'Location', label:'Location', type:'LongTextArea', extra:{length:32768,visibleLines:3} },
  { table:'Asset', dev:'Notes', label:'Notes', type:'LongTextArea', extra:{length:32768,visibleLines:3} },

  // Booking_Slot__c - add missing fields beyond StartDateTime, EndDateTime, Asset
  { table:'Booking_Slot__c', dev:'Hub', label:'Hub', type:'Lookup', extra:{referenceTo:'Hub__c',relationshipName:'BkSlotHub2'} },
  { table:'Booking_Slot__c', dev:'Opportunity', label:'Opportunity', type:'Lookup', extra:{referenceTo:'Opportunity',relationshipName:'BkSlotOpp2'} },
  { table:'Booking_Slot__c', dev:'Contact', label:'Contact', type:'Lookup', extra:{referenceTo:'Contact',relationshipName:'BkSlotContact2'} },
  { table:'Booking_Slot__c', dev:'Status', label:'Status', type:'Picklist',
    extra:{valueSet:{valueSetDefinition:{sorted:false,value:[
      {fullName:'Pending',label:'Pending',default:true},
      {fullName:'Confirmed',label:'Confirmed',default:false},
      {fullName:'Delivered',label:'Delivered',default:false},
      {fullName:'Returned',label:'Returned',default:false},
      {fullName:'Cancelled',label:'Cancelled',default:false},
    ]}}} },
  { table:'Booking_Slot__c', dev:'CustomerPostalCode', label:'Customer Postal Code', type:'Text', extra:{length:10} },
  { table:'Booking_Slot__c', dev:'DeliveryAddress', label:'Delivery Address', type:'LongTextArea', extra:{length:32768,visibleLines:3} },
  { table:'Booking_Slot__c', dev:'DeliveryNotes', label:'Delivery Notes', type:'LongTextArea', extra:{length:32768,visibleLines:3} },
  { table:'Booking_Slot__c', dev:'DeliveryDistanceKm', label:'Delivery Distance (km)', type:'Number', extra:{precision:18,scale:1} },
  { table:'Booking_Slot__c', dev:'DeliveryFee', label:'Delivery Fee', type:'Currency', extra:{precision:16,scale:2} },
  { table:'Booking_Slot__c', dev:'BasePrice', label:'Base Price', type:'Currency', extra:{precision:16,scale:2} },
  { table:'Booking_Slot__c', dev:'TotalPrice', label:'Total Price', type:'Currency', extra:{precision:16,scale:2} },

  // Addon_Product__c - already has BookingSlot master-detail, add rest
  { table:'Addon_Product__c', dev:'Product', label:'Product', type:'Lookup', extra:{referenceTo:'Product2',relationshipName:'AddonProd'} },
  { table:'Addon_Product__c', dev:'Quantity', label:'Quantity', type:'Number', extra:{precision:18,scale:0} },
  { table:'Addon_Product__c', dev:'UnitPrice', label:'Unit Price', type:'Currency', extra:{precision:16,scale:2} },
  { table:'Addon_Product__c', dev:'TotalPrice', label:'Total Price', type:'Currency', extra:{precision:16,scale:2} },

  // Service_Log__c
  { table:'Service_Log__c', dev:'Asset', label:'Asset', type:'Lookup', extra:{referenceTo:'Asset',relationshipName:'SvcLogAsset2'} },
  { table:'Service_Log__c', dev:'BookingSlot', label:'Booking Slot', type:'Lookup', extra:{referenceTo:'Booking_Slot__c',relationshipName:'SvcLogBooking2'} },
  { table:'Service_Log__c', dev:'ServiceType', label:'Service Type', type:'Picklist',
    extra:{valueSet:{valueSetDefinition:{sorted:false,value:[
      {fullName:'Cleaning',label:'Cleaning',default:true},
      {fullName:'Repair',label:'Repair',default:false},
      {fullName:'Inspection',label:'Inspection',default:false},
      {fullName:'Restock',label:'Restock',default:false},
      {fullName:'Other',label:'Other',default:false},
    ]}}} },
  { table:'Service_Log__c', dev:'ServiceDate', label:'Service Date', type:'Date' },
  { table:'Service_Log__c', dev:'Notes', label:'Notes', type:'LongTextArea', extra:{length:32768,visibleLines:3} },
  { table:'Service_Log__c', dev:'PerformedBy', label:'Performed By', type:'Text', extra:{length:100} },
  { table:'Service_Log__c', dev:'Cost', label:'Cost', type:'Currency', extra:{precision:16,scale:2} },
];

async function main() {
  console.log(`🔧 Creating ${fields.length} fields via Tooling REST API...\n`);
  let ok = 0, fail = 0;
  for (const f of fields) {
    const fullName = `${f.table}.${f.dev}__c`;
    const res = await createField(f.table, f.dev, f.label, f.type, f.extra);
    if (res.success) {
      ok++;
      console.log(`  ✅ ${fullName}`);
    } else {
      const err = res.errors[0]?.message || 'unknown';
      if (err.includes('DUPLICATE') || err.includes('exists') || err.includes('already')) {
        ok++;
        console.log(`  ⏭️  ${fullName} (exists)`);
      } else {
        fail++;
        console.log(`  ❌ ${fullName}: ${err}`);
      }
    }
  }
  console.log(`\n📊 ${ok} ok, ${fail} failed`);
}

main().catch(console.error);
