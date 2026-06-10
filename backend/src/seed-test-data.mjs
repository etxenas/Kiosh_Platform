/**
 * Final test data: just use what works. Custom fields will be added separately.
 */
import 'dotenv/config';
import { SalesforceClient } from './salesforce-client.js';

const sf = new SalesforceClient({
  instanceUrl: process.env.SF_INSTANCE_URL,
  consumerKey: process.env.SF_CONSUMER_KEY,
  consumerSecret: process.env.SF_CONSUMER_SECRET,
  username: process.env.SF_USERNAME,
});

async function main() {
  // First, clean up the test hub from before
  console.log('=== Cleaning up old test data ===');
  const oldHubs = await sf.query('SELECT Id FROM Hub__c WHERE Name LIKE \'%Test%\'');
  for (const h of oldHubs.records) {
    try { await sf.delete('Hub__c', h.Id); } catch (e) {}
  }
  console.log('Removed', oldHubs.records.length, 'old test hubs');

  // Create 2 real hubs
  console.log('\n=== Creating 2 hubs ===');
  const hubs = await sf.composite([
    { method: 'POST', url: '/services/data/v62.0/sobjects/Hub__c', referenceId: 'h1',
      body: { Name: 'Hub Stockholm' } },
    { method: 'POST', url: '/services/data/v62.0/sobjects/Hub__c', referenceId: 'h2',
      body: { Name: 'Hub Göteborg' } },
  ], true);

  let sthlmId, gbgId;
  for (const r of hubs.compositeResponse || hubs.results || []) {
    if (r.httpStatusCode >= 200 && r.httpStatusCode < 300) {
      console.log('  ✅ ' + r.referenceId + ' = ' + r.body.id);
      if (r.referenceId === 'h1') sthlmId = r.body.id;
      if (r.referenceId === 'h2') gbgId = r.body.id;
    } else {
      console.log('  ❌ ' + r.referenceId + ':', r.body);
    }
  }

  if (!sthlmId || !gbgId) {
    console.log('Hub creation failed, aborting');
    return;
  }

  // Try creating Assets (which need Account — and the Hub__c field might be ghost)
  console.log('\n=== Creating Account + 4 hyrobjekt (Assets) ===');
  const acc = await sf.create('Account', { Name: 'Hyrtoaletter AB' });
  console.log('Account created:', acc.id);

  const assets = await sf.composite([
    { method: 'POST', url: '/services/data/v62.0/sobjects/Asset', referenceId: 'a1',
      body: { Name: 'Toalett 001 - Standard', AccountId: acc.id } },
    { method: 'POST', url: '/services/data/v62.0/sobjects/Asset', referenceId: 'a2',
      body: { Name: 'Toalett 002 - Premium', AccountId: acc.id } },
    { method: 'POST', url: '/services/data/v62.0/sobjects/Asset', referenceId: 'a3',
      body: { Name: 'Toalett 003 - Standard', AccountId: acc.id } },
    { method: 'POST', url: '/services/data/v62.0/sobjects/Asset', referenceId: 'a4',
      body: { Name: 'Toalett 004 - Rullstolsanpassad', AccountId: acc.id } },
  ], true);

  const aIds = {};
  for (const r of assets.compositeResponse || assets.results || []) {
    if (r.httpStatusCode >= 200 && r.httpStatusCode < 300) {
      aIds[r.referenceId] = r.body.id;
      console.log('  ✅ ' + r.referenceId + ' = ' + r.body.id);
    } else {
      console.log('  ❌ ' + r.referenceId + ':', r.body);
    }
  }

  // Try creating 2 booking slots (with the required Asset__c ghost field)
  console.log('\n=== Creating 2 bookings ===');
  const bookings = await sf.composite([
    { method: 'POST', url: '/services/data/v62.0/sobjects/Booking_Slot__c', referenceId: 'b1',
      body: {
        Asset__c: aIds.a1,
        StartDateTime__c: '2026-06-10T08:00:00Z',
        EndDateTime__c: '2026-06-15T18:00:00Z',
      } },
    { method: 'POST', url: '/services/data/v62.0/sobjects/Booking_Slot__c', referenceId: 'b2',
      body: {
        Asset__c: aIds.a3,
        StartDateTime__c: '2026-06-12T09:00:00Z',
        EndDateTime__c: '2026-06-20T17:00:00Z',
      } },
  ], true);

  for (const r of bookings.compositeResponse || bookings.results || []) {
    if (r.httpStatusCode >= 200 && r.httpStatusCode < 300) {
      console.log('  ✅ ' + r.referenceId + ' = ' + r.body.id);
    } else {
      console.log('  ❌ ' + r.referenceId + ':', r.body);
    }
  }

  // Final summary
  console.log('\n=== Final counts ===');
  for (const obj of ['Hub__c', 'Asset', 'Booking_Slot__c', 'Service_Log__c', 'Addon_Product__c']) {
    try {
      const r = await sf.query('SELECT COUNT() FROM ' + obj);
      console.log('  ' + obj + ': ' + r.totalSize + ' records');
    } catch (e) {
      console.log('  ' + obj + ': ERROR');
    }
  }
}

main().catch(e => console.error('❌', e.message));
