// Verify the 3 bug fixes locally:
// 1. RecordType byts till B2B när billingOrgNumber tillkommer
// 2. Opportunity.Hyrto_SessionId__c sätts vid konvertering
// 3. Account.BillingPostalCode = billingPostalCode (inte leveranspostnummer)

const API = process.env.API_BASE || 'http://localhost:3200';
const ENDPOINT = `${API}/api/funnel/track`;
const HUB_GBG = 'a06fj00000FwAJMAA3';
const PROD_PRE = '01t-001';

const TS = Date.now();
const SID = (s) => `fix-${TS}-${s}`;

async function post(sessionId, step, data) {
  const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, step, data }) });
  return { status: r.status, json: await r.json() };
}

// ── FIX-test 1: RecordType-byte ──
// Start som B2C, byt till B2B i customer-steget
console.log('\n━━━━ FIX 1: RecordType ska bytas B2C→B2B när billingOrgNumber tillkommer ━━━━');
const sid1 = SID('rt-switch');
const r1a = await post(sid1, 'postalCode', { postalCode: '41101' });
console.log(`  postalCode → lead=${r1a.json.id} isB2B=${r1a.json.isB2B}`);
const r1b = await post(sid1, 'customer', { postalCode: '41101', customerName: 'Bytt B2B', customerEmail: `byttb2b+${TS}@x.se`, billingOrgNumber: '5560999888', billingCompanyName: 'B2B Sent AB', billingStreet: 'Sentgatan 1', billingPostalCode: '11122', billingCity: 'Stockholm', billingReference: 'PO-LATE' });
console.log(`  customer (with billingOrg) → lead=${r1b.json.id} isB2B=${r1b.json.isB2B}`);

// ── FIX-test 2 + 3: Full B2B med bookingCreated, verifiera Opp.SessionId + Account.BillingPostalCode ──
console.log('\n━━━━ FIX 2+3: bookingCreated → kontrollera Opp.SessionId + Account.BillingPostalCode ━━━━');
const sid2 = SID('full-b2b');
const customerData = {
  postalCode: '41101', startDate: '2026-09-01', endDate: '2026-09-10', hubId: HUB_GBG,
  products: [{ productId: PROD_PRE, quantity: 1 }], totalPrice: 5000,
  customerName: 'Fix Testare', customerEmail: `fixtest+${TS}@b2b.se`, customerPhone: '0701112233',
  deliveryAddress: 'Leveransgatan 5, 41101 Göteborg',
  billingOrgNumber: '5560777666', billingCompanyName: 'Fix-B2B AB', billingReference: 'PO-FIX',
  billingStreet: 'Fakturavägen 99', billingPostalCode: '11122', billingCity: 'Stockholm',
};
await post(sid2, 'postalCode', { postalCode: '41101' });
await post(sid2, 'dates', customerData);
await post(sid2, 'products', customerData);
await post(sid2, 'addons', customerData);
await post(sid2, 'serviceLevel', { ...customerData, serviceLevel: 'Premium' });
await post(sid2, 'review', customerData);
await post(sid2, 'customer', customerData);
const r2 = await post(sid2, 'bookingCreated', customerData);
console.log(`  bookingCreated → lead=${r2.json.id}`);
console.log(`  conversion:`, JSON.stringify(r2.json.conversion));

console.log(`\nTS=${TS}`);
console.log(`Session-IDs:\n  ${sid1}\n  ${sid2}`);
