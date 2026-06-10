# Security & Pre-Production Checklist

## 🚨 KRITISKT — innan första riktiga kunden

### 1. Rotera Salesforce credentials
- [ ] **Consumer Secret** — Setup → App Manager → `Johnny_API_Access` → View → Manage Consumer Details → "Reset Consumer Secret"
- [ ] **SF-användarens lösenord** — just nu `Test123!`. Byt till randomiserat 20+ tecken
- [ ] Uppdatera `.env` i båda projekten (lokalt + Vercel dashboard)
- [ ] Verifiera deploy fungerar efter rotation

### 2. Repo-säkerhet
- [ ] Uppgradera Vercel till **Pro plan** ($20/mån)
- [ ] Byt GitHub-repot från **public → private** (kräver Pro på Vercel)
- [ ] Aktivera **branch protection** på `main`:
  - Require pull request before merging
  - Require approval (1 reviewer minimum)
  - Block direct push
- [ ] Aktivera **Dependabot** för säkerhetsuppdateringar
- [ ] Aktivera **Secret scanning** + **Push protection** i GitHub Settings

### 3. Salesforce-org säkerhet
- [ ] Aktivera **MFA** på SF-admin-användare
- [ ] Skapa **separat integration user** (inte huvudadmin) för API-access
- [ ] Sätt **IP-restrictions** på Connected App (Vercels egress-IP-range)
- [ ] Audit log: aktivera **Field History Tracking** på känsliga fält
- [ ] Sätt **Sharing Settings** på custom objects (privat default + delning via regel)

### 4. Backend härdning
- [ ] **Rate limiting** på `/api/funnel/track` — annars kan någon spam:a Leads
- [ ] **Origin-whitelist** för CORS (just nu `*`)
- [ ] **Input validation** på alla payloads (email-format, postnummer-format, datum)
- [ ] **Sanitize SOQL** — använd parameteriserade queries där möjligt (just nu `escapeSoql` på string-values)
- [ ] **Logga inte session-tokens** i Vercel-logs

### 5. Frontend härdning
- [ ] **CSP-headers** (Content Security Policy)
- [ ] **HSTS** + force HTTPS
- [ ] **reCAPTCHA** eller liknande på customer-steg (anti-bot)
- [ ] **GDPR-cookie-banner** + samtycke-text
- [ ] **Privacy Policy** + **Terms of Service** sidor
- [ ] **Spam-skydd** på telefon/email (validera + dubbelopt-in)

### 6. Data
- [ ] **GDPR-compliance**: data retention policy, right-to-delete endpoint
- [ ] **Backup-strategi** för Salesforce-data (weekly export eller liknande)
- [ ] **PII-encryption** i transit + at rest (Salesforce Shield om budgeten finns)
- [ ] **Audit log** för admin-actions

## Status just nu (utvecklingsfas)

| Område | Status |
|---|---|
| Consumer Secret | ⚠️ Klartext i `.env`, har varit exponerad |
| SF-lösenord | ⚠️ `Test123!` (trivialt) |
| Repo | ⚠️ Public (av nödvändighet, Hobby-plan) |
| Branch protection | ❌ Ingen |
| Rate limiting | ❌ Ingen |
| CORS | ⚠️ Wildcard `*` |
| MFA på SF | ❓ Okänt — kolla |
| GDPR-text | ❌ Saknas |

## Incidenthantering

Om credentials läcker:
1. **Omedelbart:** Rotera Consumer Secret + SF-lösenord
2. Kolla SF Login History — leta efter okända IP:n
3. Kolla SF Setup Audit Trail — har någon ändrat konfiguration
4. Återställ data från senaste backup om misstanke om manipulation
5. Dokumentera incident → `docs/INCIDENTS.md`

## Pre-flight checklist (kör innan public launch)

```
[ ] Alla "KRITISKT"-punkter ovan ✅
[ ] Lasttest: 1000 samtidiga funnel-flöden
[ ] Pen-test mot prod-backend (basic OWASP top 10)
[ ] Disaster recovery test: kan vi återställa från backup på <1h?
[ ] Monitoring: Sentry eller motsvarande på frontend + backend
[ ] Alerting: Vercel deploy fails → Slack/email
[ ] On-call: vem svarar om systemet ligger nere kl 23 en fredag?
```
