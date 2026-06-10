/**
 * Salesforce REST + Tooling API client — Client Credentials OAuth.
 * Enkel server-to-server: Consumer Key + Secret → access token.
 */
export class SalesforceClient {
  constructor({ instanceUrl, consumerKey, consumerSecret, username, apiVersion = '62.0' }) {
    this.instanceUrl = instanceUrl;
    this.base = `${instanceUrl}/services/data/v${apiVersion}`;
    this.toolingBase = `${instanceUrl}/services/data/v${apiVersion}/tooling`;
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.username = username;
    this._accessToken = null;
    this._tokenExpiry = 0;
  }

  // ── Client Credentials OAuth ──
  async _getToken() {
    if (this._accessToken && Date.now() < this._tokenExpiry - 30000) {
      return this._accessToken;
    }
    console.log('🔐 Requesting access token (client_credentials)...');

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.consumerKey,
      client_secret: this.consumerSecret,
    });

    const tokenUrl = `${this.instanceUrl}/services/oauth2/token`;
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OAuth failed: ${res.status} — ${body.slice(0, 500)}`);
    }

    const data = await res.json();
    this._accessToken = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in || 7200) * 1000;
    console.log(`✅ Token received — scope: ${data.scope || 'n/a'}`);
    return this._accessToken;
  }

  // ── Core fetch ──
  async _fetch(path, opts = {}) {
    const token = await this._getToken();
    const url = path.startsWith('http') ? path : `${this.base}${path}`;
    const res = await fetch(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...opts.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      const err = new Error(body.slice(0, 500));
      err.status = res.status;
      err.sfBody = body;
      throw err;
    }
    if (res.status === 204) return {};
    return res.json();
  }

  async _fetchAll(path) {
    let allRecords = [];
    let url = path.startsWith('http') ? path : `${this.base}${path}`;
    while (url) {
      const token = await this._getToken();
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`SF API ${res.status}: ${await res.text().then(t => t.slice(0, 300))}`);
      const data = await res.json();
      allRecords = allRecords.concat(data.records || []);
      url = data.nextRecordsUrl ? `${this.base}${data.nextRecordsUrl}` : null;
    }
    return allRecords;
  }

  async query(soql, all = false) {
    const params = new URLSearchParams({ q: soql });
    return all ? this._fetchAll(`/queryAll?${params}`) : this._fetch(`/query?${params}`);
  }

  async search(sosl) {
    const params = new URLSearchParams({ q: sosl });
    return this._fetch(`/search?${params}`);
  }

  async queryTooling(soql) {
    const params = new URLSearchParams({ q: soql });
    return this._fetch(`/tooling/query?${params}`);
  }

  async composite(subrequests, allOrNone = false) {
    return this._fetch('/composite', {
      method: 'POST',
      body: JSON.stringify({ allOrNone, compositeRequest: subrequests }),
    });
  }

  async create(object, data) {
    return this._fetch(`/sobjects/${object}`, { method: 'POST', body: JSON.stringify(data) });
  }

  async bulkCreate(object, records) {
    const reqs = records.map((data, i) => ({
      method: 'POST', url: `/services/data/v${process.env.SF_API_VERSION || '62.0'}/sobjects/${object}`,
      referenceId: `rec${i}`, body: data,
    }));
    return this.composite(reqs);
  }

  async get(object, id, fields) {
    const qs = fields ? `?fields=${fields.join(',')}` : '';
    return this._fetch(`/sobjects/${object}/${id}${qs}`);
  }

  async update(object, id, data) {
    return this._fetch(`/sobjects/${object}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async delete(object, id) {
    return this._fetch(`/sobjects/${object}/${id}`, { method: 'DELETE' });
  }

  async describe(object) {
    return this._fetch(`/sobjects/${object}/describe`);
  }

  async listObjects() {
    return this._fetch('/sobjects');
  }

  async limits() {
    return this._fetch('/limits');
  }

  async orgInfo() {
    const [info, user] = await Promise.all([
      this._fetch('/'),
      this._fetch('/chatter/users/me'),
    ]);
    return { info, user };
  }

  async createTooling(obj, data) {
    return this._fetch(`/tooling/sobjects/${obj}`, { method: 'POST', body: JSON.stringify(data) });
  }

  async getTooling(obj, id) {
    return this._fetch(`/tooling/sobjects/${obj}/${id}`);
  }

  async updateTooling(obj, id, data) {
    return this._fetch(`/tooling/sobjects/${obj}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deleteTooling(obj, id) {
    return this._fetch(`/tooling/sobjects/${obj}/${id}`, { method: 'DELETE' });
  }
}
