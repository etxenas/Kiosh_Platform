// Hyrto Salesforce Backend — Vercel Serverless Function (Node.js)
// Using Node.js handler format (req, res) for Vercel compatibility

const { URL } = require('url');

class SalesforceClient {
  constructor({ instanceUrl, consumerKey, consumerSecret, username, apiVersion = '62.0' }) {
    this.instanceUrl = instanceUrl;
    this.base = `${instanceUrl}/services/data/v${apiVersion}`;
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.username = username;
    this._accessToken = null;
    this._tokenExpiry = 0;
  }

  async _getToken() {
    if (this._accessToken && Date.now() < this._tokenExpiry - 30000) return this._accessToken;
    const params = new URLSearchParams({ grant_type: 'client_credentials', client_id: this.consumerKey, client_secret: this.consumerSecret });
    const res = await fetch(`${this.instanceUrl}/services/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
    if (!res.ok) { const body = await res.text(); throw new Error(`OAuth failed: ${res.status} — ${body.slice(0, 500)}`); }
    const data = await res.json();
    this._accessToken = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in || 7200) * 1000;
    return this._accessToken;
  }

  async _fetch(path, opts = {}) {
    const token = await this._getToken();
    const url = path.startsWith('http') ? path : `${this.base}${path}`;
    const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers } });
    if (!res.ok) { const body = await res.text(); const err = new Error(body.slice(0, 500)); err.status = res.status; err.sfBody = body; throw err; }
    if (res.status === 204) return {};
    return res.json();
  }

  async query(soql) { return this._fetch(`/query?${new URLSearchParams({ q: soql })}`); }
  async create(object, data, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (opts.allowSaveOnDuplicate) headers['Sforce-Duplicate-Rule-Header'] = 'allowSave=true';
    return this._fetch(`/sobjects/${object}`, { method: 'POST', body: JSON.stringify(data), headers });
  }
  async get(object, id) { return this._fetch(`/sobjects/${object}/${id}`); }
  async update(object, id, data) { return this._fetch(`/sobjects/${object}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  async delete(object, id) { return this._fetch(`/sobjects/${object}/${id}`, { method: 'DELETE' }); }
}

const sf = new SalesforceClient({
  instanceUrl: process.env.SF_INSTANCE_URL,
  consumerKey: process.env.SF_CONSUMER_KEY,
  consumerSecret: process.env.SF_CONSUMER_SECRET,
  username: process.env.SF_USERNAME,
  apiVersion: process.env.SF_API_VERSION || '62.0',
});

function sendJSON(res, code, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.statusCode = code;
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
  });
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  const url = new URL(req.url, 'https://salesforce-backend-zeta.vercel.app');
  const path = url.pathname;
  const params = url.searchParams;
  let body = {};
  if (req.method === 'POST' || req.method === 'PATCH') {
    body = await parseBody(req);
  }

  try {
    // ── Health ──
    if (path === '/api/health' && req.method === 'GET') {
      try { await sf._getToken(); sendJSON(res, 200, { status: 'ok', authenticated: true }); }
      catch (e) { sendJSON(res, 200, { status: 'degraded', authenticated: false, error: e.message }); }
      return;
    }

    // ── Hubs ──
    if (path === '/api/hubs' && req.method === 'GET') {
      const r = await sf.query('SELECT Id, Name, Address__c, PostalCode__c, IsActive__c, BaseDeliveryFee__c, MediumDeliveryFee__c, FarDeliveryFee__c, MediumRadiusKm__c, FarRadiusKm__c, MaxDeliveryRadiusKm__c FROM Hyrto_Hub__c WHERE IsActive__c = true ORDER BY Name');
      sendJSON(res, 200, { records: r.records, totalSize: r.totalSize });
      return;
    }

    // ── Helper: query katalog med fallback om långhyra-fältena inte deployats än ──
    async function queryCatalogFamily(family) {
      const baseFields = 'Id, Product2.Id, Product2.Name, Product2.ProductCode, Product2.Family, Product2.Description, UnitPrice';
      const longRentalFields = 'Product2.Hyrto_LongRentalDailyRate__c, Product2.Hyrto_FullPriceDays__c';
      let r;
      let hasLongRental = true;
      try {
        r = await sf.query(`
          SELECT ${baseFields}, ${longRentalFields}
          FROM PricebookEntry
          WHERE Pricebook2.IsStandard = true
            AND IsActive = true
            AND Product2.IsActive = true
            AND Product2.Family = '${family}'
          ORDER BY UnitPrice
        `);
      } catch {
        hasLongRental = false;
        r = await sf.query(`
          SELECT ${baseFields}
          FROM PricebookEntry
          WHERE Pricebook2.IsStandard = true
            AND IsActive = true
            AND Product2.IsActive = true
            AND Product2.Family = '${family}'
          ORDER BY UnitPrice
        `);
      }
      return { records: r.records || [], hasLongRental };
    }

    // ── Katalog: produkter (toaletter) med pris + långhyra-rabatt ──
    if (path === '/api/catalog/products' && req.method === 'GET') {
      const { records } = await queryCatalogFamily('Toalett');
      const products = records.map(pbe => ({
        id: pbe.Product2.Id,
        pricebookEntryId: pbe.Id,
        name: pbe.Product2.Name,
        productCode: pbe.Product2.ProductCode,
        family: pbe.Product2.Family,
        description: pbe.Product2.Description,
        pricePerDay: pbe.UnitPrice,
        longRentalDailyRate: pbe.Product2.Hyrto_LongRentalDailyRate__c ?? null,
        fullPriceDays: pbe.Product2.Hyrto_FullPriceDays__c ?? null,
      }));
      sendJSON(res, 200, { products, totalSize: products.length });
      return;
    }

    // ── Katalog: addons (tillval) med pris + långhyra-rabatt ──
    if (path === '/api/catalog/addons' && req.method === 'GET') {
      const { records } = await queryCatalogFamily('Tillval');
      const addons = records.map(pbe => ({
        id: pbe.Product2.Id,
        pricebookEntryId: pbe.Id,
        name: pbe.Product2.Name,
        productCode: pbe.Product2.ProductCode,
        family: pbe.Product2.Family,
        description: pbe.Product2.Description,
        pricePerDay: pbe.UnitPrice,
        longRentalDailyRate: pbe.Product2.Hyrto_LongRentalDailyRate__c ?? null,
        fullPriceDays: pbe.Product2.Hyrto_FullPriceDays__c ?? null,
      }));
      sendJSON(res, 200, { addons, totalSize: addons.length });
      return;
    }

    // ── Katalog: tillgänglighet per produkt per hub i en datumperiod ──
    // GET /api/catalog/availability?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD[&hubId=...]
    // Returnerar: { availability: { [hubId]: { [productId]: availableCount, total } } }
    if (path === '/api/catalog/availability' && req.method === 'GET') {
      const fromDate = params.get('fromDate');
      const toDate = params.get('toDate');
      if (!fromDate || !toDate) { sendJSON(res, 400, { error: 'fromDate & toDate required (YYYY-MM-DD)' }); return; }
      const hubFilter = params.get('hubId');

      // 1) Inventarie: alla Asset med Available status, kopplade till Hub + Product
      // Asset har custom field Hyrto_Hub__c (Lookup till Hyrto_Hub__c) seedat tidigare.
      let assetQ = `SELECT Id, Hyrto_Hub__c, Product2Id, Status FROM Asset WHERE Hyrto_Hub__c != null AND Product2Id != null AND Status = 'Available'`;
      if (hubFilter) assetQ += ` AND Hyrto_Hub__c = '${hubFilter.replace(/'/g, "\\'")}'`;
      const assets = await sf.query(assetQ);

      // 2) Bokade Assets i överlappande tidsperiod
      // SF DateTime-fields kräver ISO-format utan citattecken. Konvertera datum till midnatt-grindar.
      const fromIso = `${fromDate}T00:00:00Z`;
      const toIso = `${toDate}T23:59:59Z`;
      let bookingQ = `SELECT Id, Hub__c, Asset__c FROM Hyrto_Booking__c WHERE StartDateTime__c <= ${toIso} AND EndDateTime__c >= ${fromIso} AND Status__c IN ('Bokad','Closed Won','Pågående')`;
      if (hubFilter) bookingQ += ` AND Hub__c = '${hubFilter.replace(/'/g, "\\'")}'`;
      const bookings = await sf.query(bookingQ);

      // 3) Bygg: per hub, per product, count
      const totals = {}; // {hubId: {productId: count}}
      for (const a of (assets.records || [])) {
        const hub = a.Hyrto_Hub__c;
        const prod = a.Product2Id;
        if (!totals[hub]) totals[hub] = {};
        totals[hub][prod] = (totals[hub][prod] || 0) + 1;
      }
      // Bygg lookup för asset -> (hub, product) för att kunna sub:a bokade
      const assetMap = {};
      for (const a of (assets.records || [])) {
        assetMap[a.Id] = { hub: a.Hyrto_Hub__c, product: a.Product2Id };
      }
      const booked = {}; // {hubId: {productId: count}}
      for (const b of (bookings.records || [])) {
        if (!b.Asset__c) continue;
        const am = assetMap[b.Asset__c];
        if (!am) continue;
        if (!booked[am.hub]) booked[am.hub] = {};
        booked[am.hub][am.product] = (booked[am.hub][am.product] || 0) + 1;
      }
      const availability = {};
      for (const hub of Object.keys(totals)) {
        availability[hub] = {};
        for (const prod of Object.keys(totals[hub])) {
          const total = totals[hub][prod];
          const used = (booked[hub] && booked[hub][prod]) || 0;
          availability[hub][prod] = Math.max(0, total - used);
        }
      }
      sendJSON(res, 200, { availability, fromDate, toDate, totalAssets: (assets.records || []).length, overlappingBookings: (bookings.records || []).length });
      return;
    }

    // ── Assets ──
    if (path === '/api/assets' && req.method === 'GET') {
      const r = await sf.query('SELECT Id, Name, Status, Price, Description, CreatedDate FROM Asset ORDER BY Name');
      sendJSON(res, 200, r);
      return;
    }

    // ── Bookings ──
    if (path === '/api/bookings' && req.method === 'GET') {
      let q = 'SELECT Id, Name, Hub__c, Hub__r.Name, Asset__c, Asset__r.Name, StartDateTime__c, EndDateTime__c, Status__c, CustomerName__c, CustomerEmail__c, CustomerPhone__c, DeliveryAddress__c, CustomerPostalCode__c, DistanceKm__c, DeliveryFee__c, DeliveryNotes__c, BasePrice__c, TotalPrice__c, ServiceLevel__c, ServiceIntervalHours__c, IncludesWaterRefill__c, IncludesCleaning__c FROM Hyrto_Booking__c ORDER BY StartDateTime__c';
      const where = [];
      if (params.get('hubId')) where.push(`Hub__c = '${params.get('hubId')}'`);
      if (params.get('status')) where.push(`Status__c = '${params.get('status')}'`);
      if (where.length) q += ' WHERE ' + where.join(' AND ');
      sendJSON(res, 200, await sf.query(q));
      return;
    }

    if (path === '/api/bookings' && req.method === 'POST') {
      const data = {};
      const fields = ['Hub__c', 'Asset__c', 'StartDateTime__c', 'EndDateTime__c', 'Status__c', 'CustomerName__c', 'CustomerEmail__c', 'CustomerPhone__c', 'DeliveryAddress__c', 'CustomerPostalCode__c', 'DistanceKm__c', 'DeliveryFee__c', 'DeliveryNotes__c', 'BasePrice__c', 'TotalPrice__c', 'ServiceLevel__c', 'ServiceIntervalHours__c', 'IncludesWaterRefill__c', 'IncludesCleaning__c'];
      for (const f of fields) { if (body[f] !== undefined) data[f] = body[f]; }
      if (!data.Name) data.Name = 'BK-' + Date.now();
      if (!data.Status__c) data.Status__c = 'Bokad';
      const created = await sf.create('Hyrto_Booking__c', data);
      sendJSON(res, 201, created);
      return;
    }

    // ── Availability (raw bookings i tidsperioden) ──
    if (path === '/api/availability' && req.method === 'GET') {
      const fromDate = params.get('fromDate');
      const toDate = params.get('toDate');
      if (!fromDate || !toDate) { sendJSON(res, 400, { error: 'fromDate & toDate required (YYYY-MM-DD)' }); return; }
      // SF DateTime-fields kräver ISO-literal utan citattecken.
      const fromIso = `${fromDate}T00:00:00Z`;
      const toIso = `${toDate}T23:59:59Z`;
      let q = `SELECT Id, Hub__c, Asset__c, Asset__r.Name, StartDateTime__c, EndDateTime__c, Status__c FROM Hyrto_Booking__c WHERE StartDateTime__c <= ${toIso} AND EndDateTime__c >= ${fromIso}`;
      if (params.get('hubId')) q += ` AND Hub__c = '${params.get('hubId').replace(/'/g, "\\'")}'`;
      sendJSON(res, 200, await sf.query(q));
      return;
    }

    // ── Addons ──
    if (path === '/api/addons' && req.method === 'GET') {
      sendJSON(res, 200, await sf.query('SELECT Id, Name, Booking__c, Booking__r.Name, ProductName__c, Quantity__c, UnitPrice__c, TotalPrice__c, Description__c FROM Hyrto_Addon__c ORDER BY CreatedDate DESC'));
      return;
    }

    // ── Service Logs ──
    if (path === '/api/service-logs' && req.method === 'GET') {
      sendJSON(res, 200, await sf.query('SELECT Id, Name, Asset__c, Asset__r.Name, Booking__c, ServiceType__c, ServiceDate__c, PerformedBy__c, Cost__c, Notes__c FROM Hyrto_ServiceLog__c ORDER BY ServiceDate__c DESC'));
      return;
    }

    // ── Inspections ──
    if (path === '/api/inspections' && req.method === 'GET') {
      sendJSON(res, 200, await sf.query('SELECT Id, Name, Booking__c, Booking__r.Name, Asset__c, Asset__r.Name, Type__c, InspectionDate__c, Inspector__c, CleanInterior__c, CleanExterior__c, WaterTankFull__c, PaperHolderFull__c, DoorLockOK__c, VentilationOK__c, DamagesFound__c, DamageNotes__c, DamagePhotoUrl__c, OverallCondition__c, ExtraCleaningNeeded__c, ExtraCleaningFee__c, CustomerSignature__c, Notes__c FROM Hyrto_Inspection__c ORDER BY InspectionDate__c DESC'));
      return;
    }

    // ── Service Schedules ──
    if (path === '/api/service-schedules' && req.method === 'GET') {
      sendJSON(res, 200, await sf.query('SELECT Id, Name, Booking__c, Booking__r.Name, Asset__c, Asset__r.Name, Hub__c, Hub__r.Name, ScheduledDate__c, ServiceType__c, Status__c, CompletedDate__c, PerformedBy__c, Notes__c FROM Hyrto_ServiceSchedule__c ORDER BY ScheduledDate__c'));
      return;
    }

    // ── LEAD CONVERSION HELPER ──
    async function convertLeadToCustomer(leadId, lead, totalPriceFromTracking) {
      // Build line items from JSON-fields
      const products = lead.Hyrto_Products__c ? JSON.parse(lead.Hyrto_Products__c) : [];
      const addons = lead.Hyrto_Addons__c ? JSON.parse(lead.Hyrto_Addons__c) : [];
      const isB2B = !!(lead.Hyrto_IsB2B__c || lead.Hyrto_BillingOrgNumber__c);
      const totalPrice = lead.Hyrto_TotalPrice__c || totalPriceFromTracking || 0;

      // Build LeadConvert payload
      // CloseDate är dagens datum eftersom Opportunity stags som "Closed Won" direkt vid konvertering (webbokning = stickad order).
      // Lokal tid i Europe/Stockholm så vi inte hamnar på gårdagen vid UTC-konvertering nattetid.
      const closeDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
      const oppName = `${lead.Hyrto_PostalCode__c || '?'} — ${lead.Email || lead.Company || 'webbokning'}`;

      // Try to find existing account first (dedupe)
      const RT_BIZ = '012fj000005XXaDAAW';
      const RT_PERSON = '012fj000005XXdRAAW';
      let existingAccountId = null;
      if (isB2B && lead.Hyrto_BillingOrgNumber__c) {
        try {
          const q = await sf.query(`SELECT Id FROM Account WHERE Hyrto_OrgNumber__c = '${lead.Hyrto_BillingOrgNumber__c.replace(/'/g, "\\'")}' AND IsPersonAccount = false LIMIT 1`);
          if (q.records?.length > 0) existingAccountId = q.records[0].Id;
        } catch {}
      } else if (lead.Email) {
        try {
          const q = await sf.query(`SELECT Id FROM Account WHERE PersonEmail = '${lead.Email.replace(/'/g, "\\'")}' AND IsPersonAccount = true LIMIT 1`);
          if (q.records?.length > 0) existingAccountId = q.records[0].Id;
        } catch {}
      }

      // För B2C: om ingen PersonAccount finns, skapa en INNAN konvertering så SF inte default:ar till Business Account
      if (!isB2B && !existingAccountId && lead.Email) {
        try {
          const pa = await sf.create('Account', {
            FirstName: lead.FirstName || '',
            LastName: lead.LastName || '(Okänd)',
            PersonEmail: lead.Email,
            PersonMobilePhone: lead.Phone || undefined,
            RecordTypeId: RT_PERSON,
          }, { allowSaveOnDuplicate: true });
          if (pa.success) {
            existingAccountId = pa.id;
            console.log('Pre-created PersonAccount for conversion:', existingAccountId);
          }
        } catch (e) {
          console.error('Pre-create PersonAccount failed:', e.message);
        }
      }

      // Bugg-fix 3: För B2B — pre-create Business Account med billing-adress innan convertLead,
      // annars skapar SF en default Business Account utan billing-fält.
      if (isB2B && !existingAccountId) {
        try {
          const ba = await sf.create('Account', {
            Name: lead.Hyrto_BillingCompanyName__c || lead.Company || 'Okänt företag',
            RecordTypeId: RT_BIZ,
            Phone: lead.Phone || undefined,
            Hyrto_OrgNumber__c: lead.Hyrto_BillingOrgNumber__c || undefined,
            BillingStreet: lead.Hyrto_BillingStreet__c || undefined,
            BillingPostalCode: lead.Hyrto_BillingPostalCode__c || undefined,
            BillingCity: lead.Hyrto_BillingCity__c || undefined,
          }, { allowSaveOnDuplicate: true });
          if (ba.success) {
            existingAccountId = ba.id;
            console.log('Pre-created Business Account for conversion:', existingAccountId);
          }
        } catch (e) {
          console.error('Pre-create Business Account failed:', e.message);
        }
      }

      // Call LeadConvert via SOAP API (REST har inte detta)
      const tok = await sf._getToken();
      const accountIdXml = existingAccountId ? `<urn:accountId>${existingAccountId}</urn:accountId>` : '';
      // Find the actual converted status name (first IsConverted=true LeadStatus)
      let convertedStatusName = 'Closed - Converted';
      try {
        const sq = await sf.query("SELECT ApiName, MasterLabel, IsConverted FROM LeadStatus WHERE IsConverted = true LIMIT 1");
        if (sq.records?.length > 0) convertedStatusName = sq.records[0].MasterLabel;
      } catch {}

      const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:partner.soap.sforce.com">
  <soap:Header>
    <urn:SessionHeader><urn:sessionId>${tok}</urn:sessionId></urn:SessionHeader>
    <urn:DuplicateRuleHeader><urn:allowSave>true</urn:allowSave><urn:includeRecordDetails>false</urn:includeRecordDetails><urn:runAsCurrentUser>true</urn:runAsCurrentUser></urn:DuplicateRuleHeader>
  </soap:Header>
  <soap:Body>
    <urn:convertLead>
      <urn:leadConverts>
        <urn:leadId>${leadId}</urn:leadId>
        <urn:convertedStatus>${xmlEsc(convertedStatusName)}</urn:convertedStatus>
        <urn:doNotCreateOpportunity>false</urn:doNotCreateOpportunity>
        <urn:opportunityName>${xmlEsc(oppName)}</urn:opportunityName>
        ${accountIdXml}
      </urn:leadConverts>
    </urn:convertLead>
  </soap:Body>
</soap:Envelope>`;

      const soapRes = await fetch(`${process.env.SF_INSTANCE_URL}/services/Soap/u/62.0`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=UTF-8', 'SOAPAction': '""' },
        body: soapBody,
      });
      const soapText = await soapRes.text();
      console.log('SOAP convertLead response:', soapText.slice(0, 1000));
      if (!soapRes.ok) {
        console.error('SOAP convertLead failed:', soapRes.status, soapText.slice(0, 500));
        return { error: 'Conversion failed', status: soapRes.status, details: soapText.slice(0, 500) };
      }
      const extract = (tag) => (soapText.match(new RegExp(`<${tag}>([^<]+)</${tag}>`)) || [])[1];
      const success = extract('success') === 'true';
      if (!success) {
        const errMsg = extract('message');
        console.error('Lead conversion error:', errMsg);
        return { error: 'Conversion not successful', message: errMsg, raw: soapText.slice(0, 500) };
      }
      const accountId = extract('accountId');
      const contactId = extract('contactId');
      const oppId = extract('opportunityId');
      console.log('Extracted IDs:', { accountId, contactId, oppId });

      // Mark Opp as Closed Won, set Amount, link to Account
      // Propagera ALLA relevanta Hyrto-fält från Lead till Opp så Opp blir källa för rapporter.
      try {
        await sf.update('Opportunity', oppId, {
          StageName: 'Closed Won',
          Amount: totalPrice,
          CloseDate: closeDate,
          Hyrto_SessionId__c: lead.Hyrto_SessionId__c || undefined,
          Hyrto_Hub__c: lead.Hyrto_Hub__c || undefined,
          Hyrto_StartDate__c: lead.Hyrto_StartDate__c || undefined,
          Hyrto_EndDate__c: lead.Hyrto_EndDate__c || undefined,
          Hyrto_ServiceLevel__c: lead.Hyrto_ServiceLevel__c || undefined,
          Hyrto_DeliveryAddress__c: lead.Hyrto_DeliveryAddress__c || undefined,
          Hyrto_PostalCode__c: lead.Hyrto_PostalCode__c || undefined,
          Hyrto_CustomerName__c: `${lead.FirstName || ''} ${lead.LastName || ''}`.trim() || undefined,
          Hyrto_CustomerEmail__c: lead.Email || undefined,
          Hyrto_CustomerPhone__c: lead.Phone || undefined,
          Hyrto_Products__c: lead.Hyrto_Products__c || undefined,
          Hyrto_Addons__c: lead.Hyrto_Addons__c || undefined,
          Hyrto_LastStep__c: lead.Hyrto_LastStep__c || undefined,
          Hyrto_LastActivity__c: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Opp update failed:', e.message);
        return { accountId, contactId, oppId, error: 'Opp update failed', oppError: e.message };
      }

      // Bugg-fix 3 (steg 2): Skriv billing-adress + OrgNumber till Account EFTER LeadConvert.
      // SOAP convertLead skriver över Account.BillingAddress med Lead.Street (som innehåller leveransadressen),
      // så vi måste sätta rätt billing-värden i ett separat update efter konverteringen.
      if (isB2B && accountId) {
        try {
          const accUpdate = {};
          if (lead.Hyrto_BillingStreet__c) accUpdate.BillingStreet = lead.Hyrto_BillingStreet__c;
          if (lead.Hyrto_BillingPostalCode__c) accUpdate.BillingPostalCode = lead.Hyrto_BillingPostalCode__c;
          if (lead.Hyrto_BillingCity__c) accUpdate.BillingCity = lead.Hyrto_BillingCity__c;
          if (lead.Hyrto_BillingOrgNumber__c) accUpdate.Hyrto_OrgNumber__c = lead.Hyrto_BillingOrgNumber__c;
          if (Object.keys(accUpdate).length > 0) {
            await sf.update('Account', accountId, accUpdate);
            console.log('Updated Account billing post-convert:', accountId, accUpdate);
          }
        } catch (e) {
          console.error('Post-convert Account billing update failed:', e.message);
          // not fatal — continue
        }
      }

      // Create Contract → Order → Booking-chain.
      // Contract är juridisk hyrtidsperiod; Order håller produkter+pris; Booking håller fysisk Asset-reservation.
      const PB_HYRTO = '01sfj000008eLNhAAM';
      // Frontend skickar redan riktiga SF Product2-IDs (efter mock-removal). Ingen mappning behövs.
      // Baklänges-kompatibilitet: om någon kund-lead fortfarande har gamla mock-id-formatet,
      // hoppa över den raden (loggas i itemResults).
      const looksLikeSfProductId = (id) => typeof id === 'string' && /^01t[a-zA-Z0-9]{12,15}$/.test(id);

      // ── 1) Contract ── (kräver AccountId + ContractTerm i månader, StartDate)
      let contractId = null;
      if (lead.Hyrto_StartDate__c && lead.Hyrto_EndDate__c) {
        // Räkna månader (avrundat uppåt, minst 1) som ContractTerm
        const start = new Date(lead.Hyrto_StartDate__c);
        const end = new Date(lead.Hyrto_EndDate__c);
        const months = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        try {
          const contract = await sf.create('Contract', {
            AccountId: accountId,
            Status: 'Draft',
            StartDate: lead.Hyrto_StartDate__c,
            ContractTerm: months,
          });
          if (contract.success) contractId = contract.id;
          else console.warn('Contract create failed:', JSON.stringify(contract));
        } catch (e) {
          console.warn('Contract create exception (non-fatal):', e.message);
        }
      }

      // ── 2) Order ──
      const orderPayload = {
        AccountId: accountId,
        Status: 'Draft',
        EffectiveDate: lead.Hyrto_StartDate__c || closeDate,
        Pricebook2Id: PB_HYRTO,
        Hyrto_Hub__c: lead.Hyrto_Hub__c,
        Hyrto_StartDateTime__c: lead.Hyrto_StartDate__c ? lead.Hyrto_StartDate__c + 'T08:00:00.000Z' : null,
        Hyrto_EndDateTime__c: lead.Hyrto_EndDate__c ? lead.Hyrto_EndDate__c + 'T17:00:00.000Z' : null,
        Hyrto_ServiceLevel__c: lead.Hyrto_ServiceLevel__c,
        Hyrto_DeliveryAddress__c: lead.Hyrto_DeliveryAddress__c,
        Hyrto_DeliveryNotes__c: null,
        Hyrto_BillingReference__c: lead.Hyrto_BillingReference__c,
        Hyrto_SessionId__c: lead.Hyrto_SessionId__c,
        Hyrto_CustomerPostalCode__c: lead.Hyrto_PostalCode__c,
      };
      if (typeof lead.Hyrto_DistanceKm__c === 'number') orderPayload.Hyrto_DistanceKm__c = lead.Hyrto_DistanceKm__c;
      if (typeof lead.Hyrto_DeliveryFee__c === 'number') orderPayload.Hyrto_DeliveryFee__c = lead.Hyrto_DeliveryFee__c;
      if (contractId) orderPayload.ContractId = contractId;
      let orderId = null;
      try {
        const order = await sf.create('Order', orderPayload);
        if (!order.success) {
          console.error('Order create failed:', JSON.stringify(order));
          return { accountId, contactId, oppId, contractId, error: 'Order create failed', orderError: order };
        }
        orderId = order.id;
      } catch (e) {
        console.error('Order create exception:', e.message);
        return { accountId, contactId, oppId, contractId, error: 'Order create threw', orderError: e.message };
      }

      // Get PricebookEntries for products + addons (skippa rader som inte ser ut som SF-id).
      const allProds = [...products, ...addons].filter(p => looksLikeSfProductId(p.productId));
      const itemResults = [];
      const bookingResults = [];
      let firstBookingId = null;

      if (allProds.length > 0) {
        const sfProdIds = [...new Set(allProds.map(p => p.productId))];
        const pbeQ = await sf.query(`SELECT Id, Product2Id, UnitPrice FROM PricebookEntry WHERE Pricebook2Id = '${PB_HYRTO}' AND Product2Id IN ('${sfProdIds.join("','")}')`);
        const pbeMap = {};
        for (const pbe of (pbeQ.records || [])) pbeMap[pbe.Product2Id] = { id: pbe.Id, price: pbe.UnitPrice };

        // Create OrderItems
        for (const p of allProds) {
          if (!pbeMap[p.productId]) {
            itemResults.push({ productId: p.productId, skipped: 'no PBE in Hyrto pricebook' });
            continue;
          }
          try {
            const oi = await sf.create('OrderItem', {
              OrderId: orderId,
              PricebookEntryId: pbeMap[p.productId].id,
              Quantity: p.quantity || 1,
              UnitPrice: pbeMap[p.productId].price,
            });
            itemResults.push({ productId: p.productId, ok: oi.success, id: oi.id });
          } catch (e) {
            itemResults.push({ productId: p.productId, error: e.message });
          }
        }

        // ── Reservera Asset + skapa Hyrto_Booking__c per fysisk toalett ──
        // Endast toaletter (Family='Toalett') reserveras som Asset. Tillval/Tjänster hamnar bara på Order.
        if (lead.Hyrto_Hub__c && lead.Hyrto_StartDate__c && lead.Hyrto_EndDate__c) {
          try {
            // Identifiera vilka av allProds som är toaletter
            const prodInfoQ = await sf.query(`SELECT Id, Family FROM Product2 WHERE Id IN ('${sfProdIds.join("','")}')`);
            const familyMap = {};
            for (const r of (prodInfoQ.records || [])) familyMap[r.Id] = r.Family;
            const toiletLines = allProds.filter(p => familyMap[p.productId] === 'Toalett');

            if (toiletLines.length > 0) {
              // Hämta lediga Assets för dessa toaletter i hubben
              const assetQ = await sf.query(`SELECT Id, Product2Id FROM Asset WHERE Hyrto_Hub__c = '${lead.Hyrto_Hub__c}' AND Status = 'Available' AND Product2Id IN ('${[...new Set(toiletLines.map(t => t.productId))].join("','")}')`);

              // Hämta överlappande bokningar för att exkludera redan reserverade Assets
              const fromIso = `${lead.Hyrto_StartDate__c}T00:00:00Z`;
              const toIso = `${lead.Hyrto_EndDate__c}T23:59:59Z`;
              const overlappingBookingsQ = await sf.query(`SELECT Asset__c FROM Hyrto_Booking__c WHERE Asset__c != null AND Status__c IN ('Bokad','Closed Won','Pågående') AND StartDateTime__c <= ${toIso} AND EndDateTime__c >= ${fromIso}`);
              const reservedAssetIds = new Set((overlappingBookingsQ.records || []).map(b => b.Asset__c));

              // Bygg pool av tillgängliga Assets per produkt
              const availablePool = {}; // {productId: [assetId, ...]}
              for (const a of (assetQ.records || [])) {
                if (reservedAssetIds.has(a.Id)) continue;
                if (!availablePool[a.Product2Id]) availablePool[a.Product2Id] = [];
                availablePool[a.Product2Id].push(a.Id);
              }

              // Skapa Booking per fysisk Asset (quantity = antal bokningar)
              const startDt = `${lead.Hyrto_StartDate__c}T08:00:00.000Z`;
              const endDt = `${lead.Hyrto_EndDate__c}T17:00:00.000Z`;
              for (const line of toiletLines) {
                const need = line.quantity || 1;
                const pool = availablePool[line.productId] || [];
                for (let i = 0; i < need; i++) {
                  const assetId = pool.shift();
                  if (!assetId) {
                    bookingResults.push({ productId: line.productId, skipped: 'no available asset' });
                    continue;
                  }
                  try {
                    const bookingPayload = {
                      Hub__c: lead.Hyrto_Hub__c,
                      Asset__c: assetId,
                      Account__c: accountId,
                      StartDateTime__c: startDt,
                      EndDateTime__c: endDt,
                      Status__c: 'Bokad',
                      CustomerName__c: `${lead.FirstName || ''} ${lead.LastName || ''}`.trim(),
                      CustomerEmail__c: lead.Email,
                      CustomerPhone__c: lead.Phone,
                      DeliveryAddress__c: lead.Hyrto_DeliveryAddress__c,
                      CustomerPostalCode__c: lead.Hyrto_PostalCode__c,
                      ServiceLevel__c: lead.Hyrto_ServiceLevel__c,
                      TotalPrice__c: totalPrice,
                    };
                    if (typeof lead.Hyrto_DistanceKm__c === 'number') bookingPayload.DistanceKm__c = lead.Hyrto_DistanceKm__c;
                    if (typeof lead.Hyrto_DeliveryFee__c === 'number') bookingPayload.DeliveryFee__c = lead.Hyrto_DeliveryFee__c;
                    const bk = await sf.create('Hyrto_Booking__c', bookingPayload);
                    if (bk.success) {
                      bookingResults.push({ productId: line.productId, assetId, bookingId: bk.id });
                      if (!firstBookingId) firstBookingId = bk.id;
                    } else {
                      bookingResults.push({ productId: line.productId, assetId, error: 'booking create failed', details: bk });
                    }
                  } catch (e) {
                    bookingResults.push({ productId: line.productId, assetId, error: e.message });
                  }
                }
              }
            }
          } catch (e) {
            console.error('Asset reservation / booking failed:', e.message);
            bookingResults.push({ error: 'booking-phase exception', message: e.message });
          }
        }

        // Länka Opportunity + Order → Booking (om vi har en)
        if (firstBookingId) {
          if (oppId) {
            try {
              await sf.update('Opportunity', oppId, { Hyrto_Booking__c: firstBookingId });
            } catch (e) {
              console.warn('Failed to link Opportunity → Booking:', e.message);
            }
          }
          if (orderId) {
            try {
              await sf.update('Order', orderId, { Hyrto_Booking__c: firstBookingId });
            } catch (e) {
              // Icke-fatal — från start finns inte Order.Hyrto_Booking__c-fältet. Subagenten deployar det.
              console.warn('Failed to link Order → Booking (field may not exist yet):', e.message);
            }
          }
        }
      }

      // ── A) Aktivera Contract ──
      let contractActivated = false;
      if (contractId) {
        try {
          await sf.update('Contract', contractId, { Status: 'Activated' });
          contractActivated = true;
        } catch (e) {
          console.warn('Contract activation failed (kvarstår Draft):', e.message);
        }
      }

      // ── B) Skicka bekräftelse-email ──
      // Först: försök Resend (om RESEND_API_KEY finns i env)
      // Fallback: försök SF emailSimple (kräver verified domain)
      // Sista: spara som Task på Contacten så manuellt utskick kan ske
      let emailSent = false;
      let emailMethod = 'none';
      if (lead.Email) {
        const startStr = lead.Hyrto_StartDate__c
          ? new Date(lead.Hyrto_StartDate__c).toLocaleDateString('sv-SE')
          : '?';
        const endStr = lead.Hyrto_EndDate__c
          ? new Date(lead.Hyrto_EndDate__c).toLocaleDateString('sv-SE')
          : '?';
        const customerName = `${lead.FirstName || ''} ${lead.LastName || ''}`.trim() || 'kund';
        const productsArr = lead.Hyrto_Products__c ? JSON.parse(lead.Hyrto_Products__c) : [];
        const productsList = productsArr.map(p => `• ${p.quantity}× ${p.productCode || p.productId}`).join('\n');
        const subject = `Tack för din bokning hos Hyrto — ${startStr}`;
        const bodyText = `Hej ${customerName}!\n\nTack för din bokning! Vi har tagit emot dina uppgifter.\n\nBokningsdetaljer:\n\u2022 Period: ${startStr} — ${endStr}\n\u2022 Leveransadress: ${lead.Hyrto_DeliveryAddress__c || '—'}\n${productsList ? '\nValda toaletter:\n' + productsList + '\n' : ''}\nTotalpris: ${totalPrice} kr\n\nVi hör av oss inom kort med leveransbekräftelse.\n\nMed vänliga hälsningar,\nHyrto Team`;
        const bodyHtml = `<div style="font-family:sans-serif;max-width:600px"><h2 style="color:#2D9C4A">Tack för din bokning!</h2><p>Hej ${customerName}!</p><p>Vi har tagit emot dina uppgifter och kommer att höra av oss inom kort med leveransbekräftelse.</p><h3>Bokningsdetaljer</h3><ul><li><strong>Period:</strong> ${startStr} — ${endStr}</li><li><strong>Leveransadress:</strong> ${lead.Hyrto_DeliveryAddress__c || '—'}</li></ul>${productsList ? '<h3>Valda toaletter</h3><pre style="background:#f5f5f5;padding:10px;border-radius:6px">' + productsList + '</pre>' : ''}<p style="font-size:18px;color:#FF6B35"><strong>Totalpris: ${totalPrice} kr</strong></p><p style="color:#999">Med vänliga hälsningar,<br/>Hyrto Team</p></div>`;

        // Försök 1: Resend
        if (process.env.RESEND_API_KEY) {
          try {
            const resendRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: process.env.RESEND_FROM || 'Hyrto <onboarding@resend.dev>',
                to: [lead.Email],
                subject,
                text: bodyText,
                html: bodyHtml,
              }),
            });
            const resendResult = await resendRes.json();
            if (resendRes.ok && resendResult.id) {
              emailSent = true;
              emailMethod = 'resend';
              console.log('Email sent via Resend:', resendResult.id);
            } else {
              console.warn('Resend send failed:', JSON.stringify(resendResult).slice(0, 300));
            }
          } catch (e) {
            console.warn('Resend send threw:', e.message);
          }
        }

        // Försök 2: SF emailSimple (kräver verified domain)
        if (!emailSent) {
          try {
            const tok = await sf._getToken();
            const emailRes = await fetch(`${process.env.SF_INSTANCE_URL}/services/data/v62.0/actions/standard/emailSimple`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
              body: JSON.stringify({
                inputs: [{
                  emailAddresses: lead.Email,
                  emailSubject: subject,
                  emailBody: bodyText,
                  senderType: 'CurrentUser',
                }],
              }),
            });
            const emailResult = await emailRes.json();
            emailSent = emailRes.ok && Array.isArray(emailResult) && emailResult[0]?.isSuccess;
            if (emailSent) {
              emailMethod = 'salesforce';
            } else {
              console.warn('SF emailSimple failed:', JSON.stringify(emailResult).slice(0, 300));
            }
          } catch (e) {
            console.warn('SF emailSimple threw:', e.message);
          }
        }

        // Fallback: skapa Task på Contact så manuellt utskick kan ske
        if (!emailSent && contactId) {
          try {
            const t = await sf.create('Task', {
              Subject: `📧 Skicka bekräftelse-email: ${subject}`,
              WhoId: contactId,
              WhatId: oppId || undefined,
              Status: 'Open',
              Priority: 'Normal',
              Description: `Till: ${lead.Email}\n\nInnehåll:\n${bodyText}`,
              ActivityDate: new Date().toISOString().slice(0, 10),
            });
            if (t.success) {
              emailMethod = 'task-fallback';
              console.log('Created email-task for manual send:', t.id);
            }
          } catch (e) {
            console.warn('Task fallback failed:', e.message);
          }
        }
      }

      return { accountId, contactId, oppId, contractId, contractActivated, orderId, itemResults, bookingResults, firstBookingId, emailSent, emailMethod };
    }

    // ── FUNNEL TRACKING ── Upsert Lead by sessionId
    if (path === '/api/funnel/track' && req.method === 'POST') {
      const { sessionId, step, data = {} } = body;
      if (!sessionId || !step) {
        sendJSON(res, 400, { error: 'sessionId and step required' });
        return;
      }

      // Map frontend step -> Lead.Hyrto_LastStep__c + Lead.Status
      const STEP_MAP = {
        postalCode: { last: 'Startad',       status: 'Working - Webbokning pågår' },
        dates:      { last: 'Datum',          status: 'Working - Webbokning pågår' },
        products:   { last: 'Toalett',        status: 'Working - Webbokning pågår' },
        addons:     { last: 'Tillval',        status: 'Working - Webbokning pågår' },
        serviceLevel: { last: 'Servicenivå',  status: 'Working - Webbokning pågår' },
        review:     { last: 'Översikt',       status: 'Working - Webbokning pågår' },
        customer:   { last: 'Kunduppgifter',  status: 'Working - Webbokning pågår' },
        bookingCreated: { last: 'Bokning skickad', status: 'Qualified - Bokning skickad' },
      };
      const mapped = STEP_MAP[step] || STEP_MAP.postalCode;

      const isB2B = !!(data.billingOrgNumber || data.billingCompanyName);
      const RT_B2C = '012fj000005XXOyAAO'; // Hyrto_B2C_Lead
      const RT_B2B = '012fj000005XXOxAAO'; // Hyrto_B2B_Lead
      const escapeSoql = (s) => String(s).replace(/'/g, "\\'");

      // Build Lead payload from incoming data
      const splitName = (full) => {
        const t = (full || '').trim();
        if (!t) return { first: '', last: '(Okänd)' };
        const parts = t.split(/\s+/);
        if (parts.length === 1) return { first: parts[0], last: '(Okänd)' };
        return { first: parts[0], last: parts.slice(1).join(' ') };
      };
      const nm = splitName(data.customerName);

      const leadFields = {
        Status: mapped.status,
        Hyrto_LastStep__c: mapped.last,
        Hyrto_LastActivity__c: new Date().toISOString(),
      };
      if (data.customerName) {
        leadFields.FirstName = nm.first;
        leadFields.LastName = nm.last;
      }
      if (data.customerEmail) leadFields.Email = data.customerEmail;
      if (data.customerPhone) leadFields.Phone = data.customerPhone;
      if (data.postalCode) {
        leadFields.Hyrto_PostalCode__c = data.postalCode;
        leadFields.PostalCode = data.postalCode;
      }
      // Hyrto_Hub__c är en Lookup som kräver riktigt Salesforce-id (15/18 tecken).
      // Frontend kan skicka mock-id ("hub-01") från lokala fixtures — skippa då från create/update så leadet ändock skapas.
      // (Annars 500: "Hub: id value of incorrect type" och hela lead-skalet uteblir = drop-out i funnel.)
      if (data.hubId && /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(data.hubId)) {
        leadFields.Hyrto_Hub__c = data.hubId;
      } else if (data.hubId) {
        console.warn('Skipping invalid hubId for Hyrto_Hub__c (looks like mock):', data.hubId);
      }
      if (data.startDate) leadFields.Hyrto_StartDate__c = data.startDate;
      if (data.endDate) leadFields.Hyrto_EndDate__c = data.endDate;
      if (data.serviceLevel) leadFields.Hyrto_ServiceLevel__c = data.serviceLevel;
      if (data.deliveryAddress) {
        leadFields.Hyrto_DeliveryAddress__c = data.deliveryAddress;
        leadFields.Street = data.deliveryAddress;
      }
      if (data.billingReference) leadFields.Hyrto_BillingReference__c = data.billingReference;
      if (data.billingOrgNumber) leadFields.Hyrto_BillingOrgNumber__c = data.billingOrgNumber;
      if (data.billingCompanyName) leadFields.Hyrto_BillingCompanyName__c = data.billingCompanyName;
      if (data.billingStreet) leadFields.Hyrto_BillingStreet__c = data.billingStreet;
      if (data.billingPostalCode) leadFields.Hyrto_BillingPostalCode__c = data.billingPostalCode;
      if (data.billingCity) leadFields.Hyrto_BillingCity__c = data.billingCity;
      leadFields.Hyrto_IsB2B__c = isB2B;
      if (Array.isArray(data.products) && data.products.length > 0)
        leadFields.Hyrto_Products__c = JSON.stringify(data.products).slice(0, 32000);
      if (Array.isArray(data.addons) && data.addons.length > 0)
        leadFields.Hyrto_Addons__c = JSON.stringify(data.addons).slice(0, 32000);
      if (typeof data.totalPrice === 'number') leadFields.Hyrto_TotalPrice__c = data.totalPrice;
      // Distance + deliveryFee skickas av frontend för att kunna propageras till Booking/Order.
      // Fältena kanske inte finns på Lead än — wrappas i en backup-try nedan vid skrivning.
      if (typeof data.distanceKm === 'number') leadFields.Hyrto_DistanceKm__c = data.distanceKm;
      if (typeof data.deliveryFee === 'number') leadFields.Hyrto_DeliveryFee__c = data.deliveryFee;
      // Company is required on Lead
      leadFields.Company = data.billingCompanyName || (isB2B ? 'Okänt företag' : `${nm.first} ${nm.last}`.trim() || 'Privatperson');

      // First-write-only
      const createOnly = {
        LastName: leadFields.LastName || '(Okänd)',
        Company: leadFields.Company,
        Hyrto_SessionId__c: sessionId,
        RecordTypeId: isB2B ? RT_B2B : RT_B2C,
        LeadSource: 'Web',
      };

      // Find or create Lead
      let leadId = null;
      let existingLead = null;
      try {
        const q = await sf.query(`SELECT Id, IsConverted, RecordTypeId FROM Lead WHERE Hyrto_SessionId__c = '${escapeSoql(sessionId)}' LIMIT 1`);
        if (q.records?.length > 0) {
          leadId = q.records[0].Id;
          existingLead = q.records[0];
        }
      } catch {}

      let created = false;
      if (leadId && existingLead?.IsConverted) {
        // Lead is already converted — just return its info
        sendJSON(res, 200, { id: leadId, created: false, alreadyConverted: true });
        return;
      }
      if (leadId) {
        // Bugg-fix 1: byt RecordType om B2B-data tillkommit på ett B2C-lead
        const targetRt = isB2B ? RT_B2B : RT_B2C;
        if (existingLead?.RecordTypeId && existingLead.RecordTypeId !== targetRt) {
          leadFields.RecordTypeId = targetRt;
        }
        await sf.update('Lead', leadId, leadFields);
      } else {
        try {
          const c = await sf.create('Lead', { ...createOnly, ...leadFields }, { allowSaveOnDuplicate: true });
          if (!c.success) {
            sendJSON(res, 500, { error: 'Lead create failed', details: c });
            return;
          }
          leadId = c.id;
          created = true;
        } catch (e) {
          sendJSON(res, 500, { error: 'Lead create exception', details: e.message });
          return;
        }
      }

      // ── AUTO-KONVERTERA när bokning är skickad ──
      let conversion = null;
      if (step === 'bookingCreated') {
        // Refetch lead with all fields needed for conversion
        // Försök med distance/deliveryFee-fält; om de inte finns än, fall tillbaka utan dem.
        const baseFields = `Id, FirstName, LastName, Email, Phone, Company, Hyrto_SessionId__c, Hyrto_PostalCode__c, Hyrto_Hub__c, Hyrto_StartDate__c, Hyrto_EndDate__c, Hyrto_ServiceLevel__c, Hyrto_Products__c, Hyrto_Addons__c, Hyrto_DeliveryAddress__c, Hyrto_BillingReference__c, Hyrto_BillingOrgNumber__c, Hyrto_BillingCompanyName__c, Hyrto_BillingStreet__c, Hyrto_BillingPostalCode__c, Hyrto_BillingCity__c, Hyrto_TotalPrice__c, Hyrto_IsB2B__c`;
        let leadQ;
        try {
          leadQ = await sf.query(`SELECT ${baseFields}, Hyrto_DistanceKm__c, Hyrto_DeliveryFee__c FROM Lead WHERE Id = '${leadId}'`);
        } catch {
          leadQ = await sf.query(`SELECT ${baseFields} FROM Lead WHERE Id = '${leadId}'`);
        }
        const lead = leadQ.records[0];
        try {
          conversion = await convertLeadToCustomer(leadId, lead, data.totalPrice);
        } catch (e) {
          console.error('Conversion threw:', e);
          conversion = { error: e.message };
        }
      }

      sendJSON(res, 200, {
        id: leadId,
        created,
        step: mapped.last,
        status: mapped.status,
        isB2B,
        conversion,
      });
      return;
    }

    sendJSON(res, 404, { error: 'Not found', path });
  } catch (e) {
    sendJSON(res, e.status || 500, { error: e.message, details: e.sfBody || undefined });
  }
};