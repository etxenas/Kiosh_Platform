# Kiosh Platform — Arkitektur

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────────┐
│  Slutkund       │         │  Frontend            │         │  Backend            │
│  (browser)      │ ──────▶ │  Next.js på Vercel   │ ──────▶ │  Node.js på Vercel  │
│  kiosh.se       │         │  frontend-beryl-...  │  POST   │  salesforce-...     │
└─────────────────┘         └──────────────────────┘         └──────────┬──────────┘
                                                                        │
                                                                        │ REST + SOAP
                                                                        │ OAuth Client Credentials
                                                                        ▼
                                                            ┌────────────────────────┐
                                                            │  Salesforce            │
                                                            │  Developer Edition     │
                                                            │  orgfarm-fabd595e73    │
                                                            │                        │
                                                            │  Lead → Account/       │
                                                            │  Contact/Opp/Order     │
                                                            │  + Dashboard           │
                                                            └────────────────────────┘
```

## Komponenter

### Frontend — `frontend/`
- **Stack:** Next.js 16, React 19, Tailwind CSS 4
- **Hostat på:** Vercel (`prj_oXsExdwTaGkGDYivl5PLw6SVryX4`)
- **Prod-URL:** https://frontend-beryl-six-65.vercel.app
- **Funkar som:** publik bokningssida för hyrtoaletter

#### Funnel (7 steg + bokning)
1. `postalCode` — Användaren anger leveransort
2. `dates` — Väljer hyresperiod
3. `products` — Väljer toalett-typ (Standard / Premium / Handikapp / Lyx)
4. `addons` — Lägger till tillval (Handfat, Värmefläkt, etc)
5. `serviceLevel` — Service-nivå
6. `review` — Sammanfattning
7. `customer` — Kunduppgifter (B2C eller B2B)
8. `bookingCreated` — Bekräftar bokning, triggar konvertering

Varje steg gör en `fire-and-forget` POST till backend för tracking, så vi ser dropouts.

### Backend — `backend/`
- **Stack:** Node.js serverless function (handler-style)
- **Hostat på:** Vercel (`prj_UWaelYeWznuGeGrYEJIbJxTeB4d9`)
- **Prod-URL:** https://salesforce-backend-zeta.vercel.app
- **Auth till Salesforce:** Client Credentials OAuth (server-to-server)

#### Endpoints
| Path | Method | Syfte |
|---|---|---|
| `/api/health` | GET | Sanity check |
| `/api/hubs` | GET | Lista hubs (depåer) |
| `/api/assets` | GET | Toaletter i flottan |
| `/api/bookings` | GET, POST | CRUD på bokningar |
| `/api/availability` | GET | Tillgänglighet per hub + datum |
| `/api/addons` | GET | Lista tillval |
| `/api/service-logs` | GET | Servicelogg |
| `/api/inspections` | GET | Besiktningar |
| `/api/service-schedules` | GET | Service-scheman |
| **`/api/funnel/track`** | POST | **Lead-tracking + auto-konvertering** |

#### Funnel-tracking flöde
```
Frontend POST {sessionId, step, data}
   ↓
Backend upsert Lead via Hyrto_SessionId__c
   ↓
Sätter Hyrto_LastStep__c + Status
   ↓ (när step === 'bookingCreated')
SOAP convertLead()
   ↓
Pre-create Account (B2C=PersonAccount, B2B=Business)
   ↓
Convert Lead → Contact + Opportunity
   ↓
Update Opp: Closed Won + Amount + SessionId
   ↓
Update Account: Billing-adress + OrgNumber (B2B)
   ↓
Create Order + OrderItems (via PricebookEntries)
```

### Salesforce schema

#### Custom objekt
- `Hyrto_Hub__c` — depåer
- `Hyrto_Booking__c` — bokningar (Asset__c, Hub__c, Account__c, DistanceKm__c, DeliveryFee__c)
- `Hyrto_Addon__c` — tillägg på bokning
- `Hyrto_ServiceLog__c` — servicebesök
- `Hyrto_Inspection__c` — besiktningar
- `Hyrto_ServiceSchedule__c` — schemalagd service

**OBS:** Fysiska toaletter lagras på standard `Asset` (inte custom `Hyrto_Asset__c`)
med custom lookup `Asset.Hyrto_Hub__c` → `Hyrto_Hub__c`. 25 seedade Assets från 2026-06-11.

#### Custom fields på standardobjekt
**Lead:**
- `Hyrto_SessionId__c` (unique) — kopplar funnel-session till lead
- `Hyrto_LastStep__c` — sista nådda funnel-steg (för dropout-analys)
- `Hyrto_LastActivity__c`
- `Hyrto_PostalCode__c`, `Hyrto_Hub__c`, `Hyrto_StartDate__c`, `Hyrto_EndDate__c`
- `Hyrto_DistanceKm__c`, `Hyrto_DeliveryFee__c` (2026-06-11)
- `Hyrto_ServiceLevel__c`, `Hyrto_Products__c`, `Hyrto_Addons__c`
- `Hyrto_DeliveryAddress__c`, `Hyrto_TotalPrice__c`, `Hyrto_IsB2B__c`
- `Hyrto_BillingOrgNumber__c`, `Hyrto_BillingCompanyName__c`
- `Hyrto_BillingStreet__c`, `Hyrto_BillingPostalCode__c`, `Hyrto_BillingCity__c`
- `Hyrto_BillingReference__c`

**Opportunity:**
- `Hyrto_SessionId__c`, `Hyrto_LastStep__c`, `Hyrto_LastActivity__c`
- `Hyrto_PostalCode__c`, `Hyrto_Hub__c`, `Hyrto_StartDate__c`, `Hyrto_EndDate__c`
- `Hyrto_ServiceLevel__c`, `Hyrto_Products__c`, `Hyrto_Addons__c`
- `Hyrto_DeliveryAddress__c`, `Hyrto_CustomerName__c`, `Hyrto_CustomerEmail__c`, `Hyrto_CustomerPhone__c`
- `Hyrto_Booking__c` (lookup till bokningen)

**Account:** `Hyrto_OrgNumber__c`, `Hyrto_BillingReference__c`

**Order:** `Hyrto_Hub__c`, `Hyrto_Booking__c` (2026-06-11), `Hyrto_DistanceKm__c`, `Hyrto_DeliveryFee__c`, `Hyrto_ServiceLevel__c`, `Hyrto_SessionId__c`, `Hyrto_BillingReference__c`, `Hyrto_StartDateTime__c`, `Hyrto_EndDateTime__c`. `ContractId` sätts mot auto-skapat Contract.

**Asset (standard):** `Hyrto_Hub__c` (2026-06-11) — Lookup till Hyrto_Hub__c, möjliggör inventarieräkning per hub + reservation vid bokning.

#### Record Types
- **Lead.Hyrto_B2C_Lead** (`012fj000005XXOyAAO`)
- **Lead.Hyrto_B2B_Lead** (`012fj000005XXOxAAO`)
- **Account.PersonAccount** (`012fj000005XXdRAAW`)
- **Account.Business_Account** (`012fj000005XXaDAAW`)
- **Opportunity.Hyrto_Webbokning** (`012fj000005XTA1AAO`)

#### Sales Process: `Hyrto_Funnel`
Inga standard-stages (Prospecting/Qualification borttagna). Bara:
- Hyrto 01 → 07 (motsvarar frontend-stegen)
- Closed Won / Closed Lost

#### Lead BusinessProcess: `Hyrto_Lead_Process`
- Working - Webbokning pågår
- Qualified - Bokning skickad
- Closed - Converted
- Closed - Not Converted
- Closed - Junk

#### Pricebook
- **Standard Price Book** (`01sfj000008BRukAAG`) — aktiverad
- **Hyrto Price Book** (`01sfj000008eLNhAAM`) — primär för Orders

#### Produkter
| ProductCode | Namn | Frontend-ID |
|---|---|---|
| TOA-PRE | Premiumtoalett | `01t-001` |
| TOA-STD | Standardtoalett | `01t-002` |
| TOA-HCP | Handikapptoalett | `01t-003` |
| TOA-LYX | Lyxtoalett | `01t-004` |
| ADD-HANDFAT | Handfat (tillval) | `01t-010` |
| ADD-VARME | Värmefläkt (tillval) | `01t-011` |
| ADD-LJUS | Belysning (tillval) | `01t-012` |
| ADD-STAD | Städning (tillval) | `01t-013` |

#### Dashboard
- **Namn:** Hyrto Funnel Overview
- **Id:** `01Zfj000004qUPVEA2`
- **Folder:** Hyrto Dashboards
- **URL:** https://orgfarm-fabd595e73-dev-ed.develop.lightning.force.com/lightning/r/Dashboard/01Zfj000004qUPVEA2/view
- **Komponenter:**
  - Volym per Steg (Bar)
  - Dropout — Sista aktiva steg (BarStacked)
  - Closed Won — Intäkter per månad (Column)
  - B2C vs B2B (Pie)
  - Bokningar — Översikt (Table)

## Deploy-pipeline

```
Lokal kod ändras (Kiosh_Platform/)
   ↓
git push main → github.com/etxenas/Kiosh_Platform
   ↓
Vercel webhook trigger (båda projekten)
   ↓
backend/ ändrad? → bygg salesforce-backend
frontend/ ändrad? → bygg frontend
   ↓
Live på respektive prod-URL (~15–30 sek)
```
