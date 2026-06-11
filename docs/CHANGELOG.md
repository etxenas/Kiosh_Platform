# Kiosh Platform — Changelog

## 2026-06-11 — Riktig SF-katalog + Asset-reservation + komplett lookup-kedja

### Added
- 🆕 **Postort autofylls** från postnummer via zippopotam.us (cache + in-flight dedupe)
- 🆕 **Catalog-endpoints**: `/api/catalog/products`, `/api/catalog/addons`, `/api/catalog/availability`
  - Toaletter + tillval hämtas från SF Product2 + PricebookEntry med riktiga priser
  - Availability räknas Asset minus överlappande Hyrto_Booking__c per hub per produkt
- 🆕 **Salesforce schema-tillägg** (deployade via Metadata API):
  - `Asset.Hyrto_Hub__c` (Lookup → Hyrto_Hub__c) + 25 seedade Asset-records fördelade på 4 hubs
  - `Order.Hyrto_Booking__c` (Lookup → Hyrto_Booking__c)
  - `Lead.Hyrto_DistanceKm__c` (Number 10,2) + `Lead.Hyrto_DeliveryFee__c` (Currency 10,2)
- 🆕 **Frontend lib/catalog.ts** + **lib/pricing.ts** ersätter mock-data.ts
- 🆕 **Frontend lib/postalLookup.ts** — svensk postnummer → postort
- 🆕 **Auto-byte av hub** baserat på produktval: kunden ser inte hub-listan, vi väljer billigaste
  - Banner '📦 Vi byter depot åt dig — X kr högre i leverans' när val tvingar dyrare hub
  - Röd kontakta-oss-banner + låst 'Fortsätt' om INGEN hub har allt valt
- 🆕 **Kedjad konvertering**: Lead → Account + Contact + Opportunity + Contract + Order + OrderItems + Hyrto_Booking__c(s) + Asset-reservation
- 🆕 **Contract auto-aktiveras** (Status='Activated') vid konvertering
- 🆕 **Distance + DeliveryFee propageras** Lead → Order → Booking

### Fixed
- ✅ **Drop-out-bugg på postalCode**: backend skickade mock-hubId till `Hyrto_Hub__c` lookup→500-fel→inget lead skapades. Skippar nu hubId om inte SF-id-format.
- ✅ **Opportunity.CloseDate** är nu **idag** (var idag+30 dagar; trasade pipeline-rapporter eftersom orden är 'Closed Won' direkt vid webbokning)
- ✅ **Toalett-emojier** mappas nu på ProductCode (TOA-PRE/STD/HCP/LYX) istället för hårdkodade mock-IDs
- ✅ **Opportunity.Hyrto_Hub__c + datum + ServiceLevel + kund + produkter + addons** propageras nu från Lead vid konvertering
- ✅ **Order.ContractId** sätts mot nyskapat Contract
- ✅ **Hyrto_Booking__c.Asset__c** reserveras (en booking per fysisk Asset)
- ✅ **Opportunity.Hyrto_Booking__c + Order.Hyrto_Booking__c** pekar på första bookingen

### Verifierat end-to-end
Lead 00Qfj…Vr7Sw → Account 001fj…ByaA → Opp 006fj…Nu1 (Closed Won, CloseDate=idag) →
Contract 800fj…XBz (#00000102, **Activated**) → Order 801fj… (#00000113) →
Booking a05fj… → Asset 'Toalett STN-003 (TOA-STD-STN-003)' ✅

### Quirks dokumenterade
- `EmailMessage` via SF `emailSimple` kräver verified domain — funkar inte i Dev Edition (`INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY`). Fallback: skapar Task på Contact med komplett mail-content.
- Apple Color Emoji 📅 är hårdkodad till '17 JUL' — inte en bugg, det är ikonen
- SOQL DateTime-fields kräver ISO-literal utan citattecken (`StartDateTime__c <= 2026-07-03T00:00:00Z`, inte `'2026-07-03'`)

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
