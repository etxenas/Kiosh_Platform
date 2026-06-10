// End-to-end testing of /api/funnel/track on prod backend
// Verifies each step lands correctly on Lead in Salesforce.

import { spawnSync } from 'child_process';

const API = 'https://salesforce-backend-zeta.vercel.app/api/funnel/track';
const HUB_GBG = 'a06fj00000FwAJMAA3'; // Göteborg Central
const HUB_STO = 'a06fj00000Fwg6IAAR'; // Malmö Syd (we'll use any)
// Frontend uses mock-product-ids (01t-XXX); backend maps these via PRODUCT_IDS to real SF Product2.Id.
const PROD_STD = '01t-002'; // Standardtoalett (TOA-STD)
const PROD_PRE = '01t-001'; // Premiumtoalett (TOA-PRE)
const ADDON_VARME = '01t-011'; // Värmefläkt (ADD-VARME)

const TS = Date.now();
const SID = (suffix) => `test-${TS}-${suffix}`;

const results = [];

async function post(sessionId, step, data) {
  const t0 = Date.now();
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, step, data }),
  });
  const ms = Date.now() - t0;
  const txt = await r.text();
  let json; try { json = JSON.parse(txt); } catch { json = { raw: txt }; }
  return { status: r.status, ok: r.ok, ms, json };
}

async function logStep(sessionId, step, data, expected) {
  const res = await post(sessionId, step, data);
  const entry = { sessionId, step, status: res.status, ms: res.ms, leadId: res.json.id, created: res.json.created, mappedStep: res.json.step, mappedStatus: res.json.status, isB2B: res.json.isB2B, conversion: res.json.conversion ? 'see-below' : null, expected, raw: res.json };
  results.push(entry);
  const ok = res.status === 200;
  console.log(`${ok?'✅':'❌'} ${step.padEnd(16)} ${res.status} ${res.ms}ms  lead=${res.json.id || '-'}  step="${res.json.step || '-'}"  status="${(res.json.status||'').slice(0,40)}"`);
  if (!ok) console.log('   ↳ body:', JSON.stringify(res.json).slice(0, 400));
  if (res.json.conversion) console.log('   ↳ conversion:', JSON.stringify(res.json.conversion).slice(0, 600));
  return res.json;
}

// ────── Test 1: B2C full flow (Göteborg, ingen bokning – stannar på customer) ──────
console.log('\n━━━━━━━━ TEST 1: B2C — funnel utan bokning (Göteborg) ━━━━━━━━');
{
  const sid = SID('t1-b2c-noBooking');
  await logStep(sid, 'postalCode', { postalCode: '41101' });
  await logStep(sid, 'dates',      { postalCode: '41101', startDate: '2026-07-01', endDate: '2026-07-07', hubId: HUB_GBG });
  await logStep(sid, 'products',   { postalCode: '41101', startDate: '2026-07-01', endDate: '2026-07-07', hubId: HUB_GBG, products: [{ productId: PROD_STD, quantity: 2 }] });
  await logStep(sid, 'addons',     { postalCode: '41101', startDate: '2026-07-01', endDate: '2026-07-07', hubId: HUB_GBG, products: [{ productId: PROD_STD, quantity: 2 }], addons: [{ productId: ADDON_VARME, quantity: 1 }] });
  await logStep(sid, 'serviceLevel',{ postalCode: '41101', startDate: '2026-07-01', endDate: '2026-07-07', hubId: HUB_GBG, products: [{ productId: PROD_STD, quantity: 2 }], serviceLevel: 'Standard' });
  await logStep(sid, 'review',     { postalCode: '41101', startDate: '2026-07-01', endDate: '2026-07-07', hubId: HUB_GBG, products: [{ productId: PROD_STD, quantity: 2 }], totalPrice: 2500 });
  await logStep(sid, 'customer',   { postalCode: '41101', startDate: '2026-07-01', endDate: '2026-07-07', hubId: HUB_GBG, products: [{ productId: PROD_STD, quantity: 2 }], totalPrice: 2500, customerName: 'Anna Testsson', customerEmail: `anna.test+${TS}@example.com`, customerPhone: '0701234567', deliveryAddress: 'Testgatan 1, 41101 Göteborg' });
}

// ────── Test 2: B2B full flow + booking (auto-konvertering) ──────
console.log('\n━━━━━━━━ TEST 2: B2B — full funnel + bookingCreated (Göteborg) ━━━━━━━━');
{
  const sid = SID('t2-b2b-bookingCreated');
  await logStep(sid, 'postalCode', { postalCode: '41101' });
  await logStep(sid, 'dates',      { postalCode: '41101', startDate: '2026-08-01', endDate: '2026-08-14', hubId: HUB_GBG });
  await logStep(sid, 'products',   { postalCode: '41101', startDate: '2026-08-01', endDate: '2026-08-14', hubId: HUB_GBG, products: [{ productId: PROD_PRE, quantity: 3 }] });
  await logStep(sid, 'addons',     { postalCode: '41101', startDate: '2026-08-01', endDate: '2026-08-14', hubId: HUB_GBG, products: [{ productId: PROD_PRE, quantity: 3 }], addons: [] });
  await logStep(sid, 'serviceLevel',{ postalCode: '41101', startDate: '2026-08-01', endDate: '2026-08-14', hubId: HUB_GBG, products: [{ productId: PROD_PRE, quantity: 3 }], serviceLevel: 'Premium' });
  await logStep(sid, 'review',     { postalCode: '41101', startDate: '2026-08-01', endDate: '2026-08-14', hubId: HUB_GBG, products: [{ productId: PROD_PRE, quantity: 3 }], totalPrice: 12000 });
  await logStep(sid, 'customer',   { postalCode: '41101', startDate: '2026-08-01', endDate: '2026-08-14', hubId: HUB_GBG, products: [{ productId: PROD_PRE, quantity: 3 }], totalPrice: 12000, customerName: 'Bjarne Bygg', customerEmail: `bjarne.test+${TS}@bygg.se`, customerPhone: '0709876543', deliveryAddress: 'Bygggatan 5, 41101 Göteborg', billingOrgNumber: '5560123456', billingCompanyName: 'Bygg AB', billingReference: 'PO-1234', billingStreet: 'Fakturagatan 1', billingPostalCode: '11122', billingCity: 'Stockholm' });
  await logStep(sid, 'bookingCreated', { postalCode: '41101', startDate: '2026-08-01', endDate: '2026-08-14', hubId: HUB_GBG, products: [{ productId: PROD_PRE, quantity: 3 }], totalPrice: 12000, customerName: 'Bjarne Bygg', customerEmail: `bjarne.test+${TS}@bygg.se`, customerPhone: '0709876543', deliveryAddress: 'Bygggatan 5, 41101 Göteborg', billingOrgNumber: '5560123456', billingCompanyName: 'Bygg AB', billingReference: 'PO-1234' });
}

// ────── Test 3: Dropouts — flera sessioner som avbryter på olika steg ──────
console.log('\n━━━━━━━━ TEST 3: Dropouts på olika steg ━━━━━━━━');
const dropouts = [
  ['postalCode',   { postalCode: '11122' }],
  ['dates',        { postalCode: '11122', startDate: '2026-09-01', endDate: '2026-09-03', hubId: HUB_GBG }],
  ['products',     { postalCode: '11122', startDate: '2026-09-01', endDate: '2026-09-03', hubId: HUB_GBG, products: [{ productId: PROD_STD, quantity: 1 }] }],
  ['serviceLevel', { postalCode: '11122', startDate: '2026-09-01', endDate: '2026-09-03', hubId: HUB_GBG, products: [{ productId: PROD_STD, quantity: 1 }], serviceLevel: 'Basic' }],
];
for (let i = 0; i < dropouts.length; i++) {
  const [step, data] = dropouts[i];
  const sid = SID(`t3-drop-${step}`);
  // Walk through previous steps too so the last-step is genuine
  await logStep(sid, 'postalCode', { postalCode: data.postalCode });
  if (step !== 'postalCode') await logStep(sid, 'dates', data);
  if (['products','addons','serviceLevel','review','customer'].includes(step)) await logStep(sid, 'products', data);
  if (['serviceLevel','review','customer'].includes(step)) await logStep(sid, 'serviceLevel', data);
}

// ────── Test 4: Re-entry — samma sessionId, går bakåt och uppdaterar ──────
console.log('\n━━━━━━━━ TEST 4: Re-entry (samma sessionId, byter datum + produkt) ━━━━━━━━');
{
  const sid = SID('t4-reentry');
  await logStep(sid, 'postalCode', { postalCode: '41101' });
  await logStep(sid, 'dates',      { postalCode: '41101', startDate: '2026-10-01', endDate: '2026-10-05', hubId: HUB_GBG });
  await logStep(sid, 'products',   { postalCode: '41101', startDate: '2026-10-01', endDate: '2026-10-05', hubId: HUB_GBG, products: [{ productId: PROD_STD, quantity: 1 }] });
  console.log('  → går bakåt, ändrar datum + byter till Premium');
  await logStep(sid, 'dates',      { postalCode: '41101', startDate: '2026-10-10', endDate: '2026-10-20', hubId: HUB_GBG });
  await logStep(sid, 'products',   { postalCode: '41101', startDate: '2026-10-10', endDate: '2026-10-20', hubId: HUB_GBG, products: [{ productId: PROD_PRE, quantity: 2 }] });
}

// ────── Save results ──────
import { writeFileSync } from 'fs';
writeFileSync(`/Users/andersjohansson2/.openclaw/workspace/johnny/tests/funnel-test-results-${TS}.json`, JSON.stringify(results, null, 2));
console.log(`\n💾 ${results.length} requests sparade i tests/funnel-test-results-${TS}.json`);
console.log(`📌 TS=${TS}`);
