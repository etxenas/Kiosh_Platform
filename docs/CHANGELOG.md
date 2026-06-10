# Kiosh Platform — Changelog

## 2026-06-10 — Mono-repo setup + bugfixar + auto-deploy

### Added
- 🆕 GitHub mono-repo: `etxenas/Kiosh_Platform` (public för Hobby-plan)
- 🆕 Vercel ↔ GitHub auto-deploy aktiverad för båda projekten
- 🆕 Logo-koncept (3 riktningar) — `docs/logo-concepts.html`
- 🆕 Dokumentation: `ARCHITECTURE.md`, `DEPLOY.md`, `BRAND.md`, `CHANGELOG.md`
- 🆕 Testprotokoll med 30+ verifierade requests — `tests/TESTPROTOKOLL-funnel-2026-06-10.md`
- 🆕 End-to-end-testskript — `tests/funnel-test.mjs`

### Fixed
- ✅ **Bugg 1:** Lead.RecordType byts B2C→B2B när billingOrgNumber tillkommer i senare steg
- ✅ **Bugg 2:** `Opportunity.Hyrto_SessionId__c` propageras vid konvertering
- ✅ **Bugg 3:** Account billing-adress + Hyrto_OrgNumber sätts korrekt (post-convert update, eftersom SOAP convertLead skriver över Account.BillingAddress med Lead.Street)

### Security
- 🚨 Tog bort `CREDENTIALS_FOR_AGENT.md` ur repot — innehöll SF-password + Consumer Secret i klartext
- 🚨 Tog bort `BUSINESS_PROCESSES.html/pdf` — renderade kopior med Consumer Secret i curl-exempel
- ⚠️ Att-göra: Rotera Consumer Secret + byt SF-lösenord innan produktion

### Quirks dokumenterade
- `Account.BillingCountry='Sverige'` rejected (state/country picklists) — lämna tomt
- SOAP convertLead skriver över Account.BillingAddress
- Vercel Hobby plan + private repo = BLOCKED → publikt repo eller Pro
- zsh history-expansion på `!` i `echo "...!..."` — använd heredoc istället

## 2026-06-09 — Backend deployad

- Vercel-deploy av salesforce-backend
- Client Credentials OAuth fungerar
- Frontend uppdaterad med `NEXT_PUBLIC_API_BASE` mot prod-backend

### Dashboard
- "Hyrto Funnel Overview" deployad (`01Zfj000004qUPVEA2`)
- 5 komponenter: Volym/Dropout/Closed Won/B2C vs B2B/Bokningar

### Schema-refactor (Lead-first)
- Lead → Account/Contact/Opp/Order auto-konvertering via SOAP convertLead
- Pre-create PersonAccount för B2C, Business Account för B2B
- Order + OrderItem-skapande via PricebookEntries
- DuplicateRules bypass via `Sforce-Duplicate-Rule-Header: allowSave=true`

### Schema-tillägg
- Lead: 19 custom fields (funnel-data + B2B billing)
- Lead BusinessProcess: `Hyrto_Lead_Process` (5 statusar)
- Lead Record Types: B2C + B2B
- Order: 12 nya custom fields
- Standard Pricebook aktiverad + Hyrto Price Book skapad
- 10 Product2-records med PricebookEntries

### Bugfixar
- NEXT_PUBLIC_API_BASE var tom i Vercel-bygget (tracking failade i prod)
- Hub-väljare gick inte att klicka på — fix: klickbara `<button>`
- Back-knapp saknades i StepDates
- Avståndsberäkning var random — ersatt med haversine + lat/lng-tabell för 90 svenska postnummer-prefix

## 2026-06-08 — Schema komplett

- Custom objekt: Hub, Asset, Booking, ServiceLog, Inspection, ServiceSchedule, AddonProduct, BookingSlot
- Frontend live på Vercel
- Backend pekar mot Salesforce dev-org

## Tidigare

Tidigare daglig progress dokumenterad i Johnny's memory (`memory/YYYY-MM-DD.md`).
