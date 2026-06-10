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
      const r = await sf.query('SELECT Id, Name, Address__c, PostalCode__c, IsActive__c, BaseDeliveryFee__c, MediumDeliveryFee__c, FarDeliveryFee__c, MediumRadiusKm__c, FarRadiusKm__c, MaxDeliveryRadiusKm__c FROM Hyrto_Hub__c ORDER BY Name');
      sendJSON(res, 200, { records: r.records, totalSize: r.totalSize });
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

    // ── Availability ──
    if (path === '/api/availability' && req.method === 'GET') {
      const fromDate = params.get('fromDate');
      const toDate = params.get('toDate');
      if (!fromDate || !toDate) { sendJSON(res, 400, { error: 'fromDate & toDate required' }); return; }
      let q = `SELECT Id, Hub__c, Asset__c, Asset__r.Name, StartDateTime__c, EndDateTime__c, Status__c FROM Hyrto_Booking__c WHERE StartDateTime__c <= ${toDate} AND EndDateTime__c >= ${fromDate}`;
      if (params.get('hubId')) q += ` AND Hub__c = '${params.get('hubId')}'`;
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
      const closeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
      // Bugg-fix 2: propagera Hyrto_SessionId__c till Opp för spårbarhet
      try {
        await sf.update('Opportunity', oppId, {
          StageName: 'Closed Won',
          Amount: totalPrice,
          CloseDate: closeDate,
          Hyrto_SessionId__c: lead.Hyrto_SessionId__c || undefined,
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

      // Create Order with Hyrto-fields + OrderItems
      const PB_HYRTO = '01sfj000008eLNhAAM';
      const PRODUCT_IDS = {
        '01t-001': '01tfj00000CbRS9AAN', // TOA-PRE
        '01t-002': '01tfj00000CbRVNAA3', // TOA-STD
        '01t-003': '01tfj00000CbRWzAAN', // TOA-HCP
        '01t-004': '01tfj00000CbRYbAAN', // TOA-LYX
        '01t-010': '01tfj00000CbRaDAAV', // ADD-HANDFAT
        '01t-011': '01tfj00000CbRbpAAF', // ADD-VARME
        '01t-012': '01tfj00000CbRdRAAV', // ADD-LJUS
        '01t-013': '01tfj00000CbRf3AAF', // ADD-STAD
      };

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
      let orderId = null;
      try {
        const order = await sf.create('Order', orderPayload);
        if (!order.success) {
          console.error('Order create failed:', JSON.stringify(order));
          return { accountId, contactId, oppId, error: 'Order create failed', orderError: order };
        }
        orderId = order.id;
      } catch (e) {
        console.error('Order create exception:', e.message);
        return { accountId, contactId, oppId, error: 'Order create threw', orderError: e.message };
      }

      // Get PricebookEntries for products
      const allProds = [...products, ...addons];
      const productCodeMap = {};
      for (const p of allProds) {
        const sfProdId = PRODUCT_IDS[p.productId];
        if (sfProdId) productCodeMap[p.productId] = sfProdId;
      }
      const sfProdIds = Object.values(productCodeMap);
      if (sfProdIds.length > 0) {
        const pbeQ = await sf.query(`SELECT Id, Product2Id, UnitPrice FROM PricebookEntry WHERE Pricebook2Id = '${PB_HYRTO}' AND Product2Id IN ('${sfProdIds.join("','")}')`);
        const pbeMap = {};
        for (const pbe of (pbeQ.records || [])) pbeMap[pbe.Product2Id] = { id: pbe.Id, price: pbe.UnitPrice };

        // Create OrderItems
        const itemResults = [];
        for (const p of allProds) {
          const sfProdId = PRODUCT_IDS[p.productId];
          if (!sfProdId || !pbeMap[sfProdId]) {
            itemResults.push({ productId: p.productId, skipped: 'no PBE' });
            continue;
          }
          try {
            const oi = await sf.create('OrderItem', {
              OrderId: orderId,
              PricebookEntryId: pbeMap[sfProdId].id,
              Quantity: p.quantity || 1,
              UnitPrice: pbeMap[sfProdId].price,
            });
            itemResults.push({ productId: p.productId, ok: oi.success, id: oi.id });
          } catch (e) {
            itemResults.push({ productId: p.productId, error: e.message });
          }
        }
        return { accountId, contactId, oppId, orderId, itemResults };
      }

      return { accountId, contactId, oppId, orderId };
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
      if (data.hubId) leadFields.Hyrto_Hub__c = data.hubId;
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
        const leadQ = await sf.query(`SELECT Id, FirstName, LastName, Email, Phone, Company, Hyrto_SessionId__c, Hyrto_PostalCode__c, Hyrto_Hub__c, Hyrto_StartDate__c, Hyrto_EndDate__c, Hyrto_ServiceLevel__c, Hyrto_Products__c, Hyrto_Addons__c, Hyrto_DeliveryAddress__c, Hyrto_BillingReference__c, Hyrto_BillingOrgNumber__c, Hyrto_BillingCompanyName__c, Hyrto_BillingStreet__c, Hyrto_BillingPostalCode__c, Hyrto_BillingCity__c, Hyrto_TotalPrice__c, Hyrto_IsB2B__c FROM Lead WHERE Id = '${leadId}'`);
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