# Testprotokoll — Hyrto Funnel Tracking

**Datum:** 2026-06-10
**Testare:** Johnny (på Boss instruktion)
**System under test:**
- Backend: `https://salesforce-backend-zeta.vercel.app/api/funnel/track` (Vercel)
- Salesforce-org: `orgfarm-fabd595e73-dev-ed` (Developer Edition)
- Frontend-form (källkod): `projects/hyrtoaletter/frontend/src/lib/funnel.ts`

**Testskript:** `tests/funnel-test.mjs` (Node, kör direkt mot prod-backend)
**Råresultat:** `tests/funnel-test-results-1781115216246.json` (30 requests)

---

## 1. Testmiljö & förutsättningar

| Komponent | Status | Detalj |
|---|---|---|
| Backend `/api/health` | ✅ ok | `{status: "ok", authenticated: true}` |
| OAuth (client_credentials) | ✅ | Token-flöde fungerar |
| Hubs i org | ✅ 3 st | Göteborg Central, Malmö Syd, m.fl. |
| Products i Hyrto Pricebook | ✅ 8 st | TOA-PRE/STD/HCP/LYX + ADD-* |
| PricebookEntries | ✅ | Krävs för OrderItem |
| Dashboard | ✅ deployad | `01Zfj000004qUPVEA2` (Hyrto Funnel Overview) |

---

## 2. Testfall

Identifierare för testkörningen: `TS=1781115216246` (alla testleads har sessionId `test-1781115216246-*`).

### Test 1 — B2C utan bokning (Göteborg)

**Syfte:** Verifiera att alla 7 steg fram till `customer` registreras på samma Lead.

**Steg:** `postalCode` → `dates` → `products` → `addons` → `serviceLevel` → `review` → `customer`

**Resultat:** ✅ Alla steg returnerade HTTP 200, alla update:ade samma Lead `00Qfj00000VkrqgEAB`.

| Frontend-steg | HTTP | Latens | `Hyrto_LastStep__c` | Status |
|---|---|---|---|---|
| postalCode | 200 | 783ms | Startad | Working - Webbokning pågår |
| dates | 200 | 1526ms | Datum | Working - Webbokning pågår |
| products | 200 | 512ms | Toalett | Working - Webbokning pågår |
| addons | 200 | 511ms | Tillval | Working - Webbokning pågår |
| serviceLevel | 200 | 408ms | Servicenivå | Working - Webbokning pågår |
| review | 200 | 614ms | Översikt | Working - Webbokning pågår |
| customer | 200 | 1128ms | Kunduppgifter | Working - Webbokning pågår |

**SF-verifiering (Lead `00Qfj00000VkrqgEAB`):**
- RecordType: `Hyrto_B2C_Lead` ✅
- Namn: Anna Testsson ✅
- Email: anna.test+1781115216246@example.com ✅
- Telefon: 0701234567 ✅
- Postnr: 41101, Datum: 2026-07-01 → 2026-07-07 ✅
- Hub: Göteborg Central ✅
- ServiceLevel: Standard ✅
- Products: `[{"productId":"01t-002","quantity":2}]` (Standardtoalett × 2) ✅
- Addons: Värmefläkt × 1 ✅
- TotalPrice: 2500 kr ✅
- Delivery: Testgatan 1, 41101 Göteborg ✅
- IsConverted: false ✅ (ingen bokning skickad)

### Test 2 — B2B med bokning (auto-konvertering)

**Syfte:** Verifiera att `bookingCreated` triggar Lead-konvertering → Account/Contact/Opp/Order/OrderItem.

**Resultat:** ✅ Alla 8 steg HTTP 200. Konvertering lyckades.

**Lead `00Qfj00000Vl09BEAR`:**
- IsConverted: **true** ✅
- Status: `Closed - Converted` ✅
- LastStep: `Bokning skickad` ✅
- Hyrto_IsB2B__c: true ✅
- B2B-fält: OrgNr 5560123456, Bygg AB, Ref PO-1234 ✅

**Skapade poster vid konvertering:**

| Objekt | Id | Detalj |
|---|---|---|
| Account | `001fj00001IegiVAAR` | Bygg AB, RecordType `Business_Account` ✅ |
| Contact | `003fj000015iIibAAE` | Bjarne Bygg, kopplad till account ✅ |
| Opportunity | `006fj00000G3JmTAAV` | Closed Won, Amount 12000 kr, RT `Hyrto_Webbokning` ✅ |
| Order | `801fj00001IfCbtAAF` | Status Draft, OrderNumber 00000104, TotalAmount **4500 kr** |
| OrderItem | `802fj00000ef2oVAAQ` | Premiumtoalett × 3 @ 1500 kr = 4500 ✅ |

Konverterings-latens: ~8.4 sek (inkl SOAP convertLead + alla post-skapande).

### Test 3 — Dropouts på olika steg

**Syfte:** Verifiera att Leads med olika `Hyrto_LastStep__c` syns korrekt för dashboard-rapporten "Lead Dropout".

**Resultat:** ✅ 4 separata sessioner skapade, sista steg per session korrekt:

| Session | LastStep | LeadId |
|---|---|---|
| t3-drop-postalCode | Startad | `00Qfj00000Vl0CPEAZ` |
| t3-drop-dates | Datum | `00Qfj00000VkATyEAN` |
| t3-drop-products | Toalett | `00Qfj00000VkRRmEAN` |
| t3-drop-serviceLevel | Servicenivå | `00Qfj00000VkzReEAJ` |

Dropout-rapporten kan nu visa förlustpunkter i funneln.

### Test 4 — Re-entry (samma sessionId, byter datum + produkt)

**Syfte:** Verifiera att samma session som hoppar bakåt och ändrar val skriver över Lead utan att skapa dublett.

**Steg:**
1. postalCode → dates(2026-10-01→05) → products(Standard)
2. går bakåt: dates(**2026-10-10→20**) → products(**Premium**)

**Resultat:** ✅ Bara EN Lead `00Qfj00000Vl0FdEAJ` skapades. Slutvärdena är de nya:
- Datum: 2026-10-10 → 2026-10-20 ✅
- Products: Premiumtoalett × 2 ✅

Bekräftar upsert-logik via `Hyrto_SessionId__c` fungerar.

---

## 3. Sammanfattande resultat

| Verifierat krav | Status |
|---|---|
| Alla 8 frontend-steg accepteras av backend | ✅ |
| `Hyrto_LastStep__c` mappar 1:1 mot frontend-steg | ✅ |
| Lead-status uppdateras enligt steg | ✅ |
| Samma sessionId → upsert på samma Lead (ingen dublett) | ✅ |
| Re-entry skriver över med senaste värden | ✅ |
| B2C → RecordType `Hyrto_B2C_Lead` | ✅ |
| B2B → Lead `Hyrto_IsB2B__c=true` | ✅ |
| `bookingCreated` triggar SOAP-konvertering | ✅ |
| B2B → Business Account (inte PersonAccount) | ✅ |
| Opp → Closed Won + korrekt Amount | ✅ |
| Order skapas med Pricebook + Hub + ServiceLevel | ✅ |
| OrderItem skapas med PricebookEntry + Quantity + UnitPrice | ✅ |
| TotalAmount räknas från OrderItems | ✅ (4500 kr) |
| Latens API < 2 sek normal, < 9 sek vid konvertering | ✅ |

**30/30 API-anrop returnerade HTTP 200. Inga 4xx/5xx.**

---

## 4. Fynd & buggar

### ⚠️ Bugg 1 — RecordType byts inte när B2B-data tillkommer senare

**Reproducerbart i:** Test 2 (första körningen `1781115091047`, då jag testade utan att skicka B2B-fält tidigt). Lead skapades vid `postalCode` med RT `Hyrto_B2C_Lead`. Senare när `customer`-steget skickade `billingOrgNumber` sattes `Hyrto_IsB2B__c=true` men RecordType **bytte inte** till `Hyrto_B2B_Lead`.

**Effekt:** Lead-listvyer som filtrerar på RecordType visar B2B-leads under B2C tills bokningen skickas.

**Föreslagen fix:** I `/api/funnel/track`, om `isB2B === true` och leadens nuvarande `RecordTypeId !== RT_B2B`, inkludera `RecordTypeId: RT_B2B` i update-payloaden. Notera: Salesforce kräver att man har Permission att byta RT på Lead — testa.

### ⚠️ Bugg 2 — Opportunity.Hyrto_SessionId__c är null efter konvertering

**Reproducerbart:** Båda testkörningarna. Order får `Hyrto_SessionId__c` korrekt, men Opp får `null`.

**Effekt:** Svårt att spåra vilken funnel-session som ledde till en konkret Opp; rapporter som korslänkar Lead↔Opp via session får hål.

**Föreslagen fix:** I `convertLeadToCustomer` (api/index.js ~rad 270): efter att Opp uppdaterats med StageName/Amount, lägg till `Hyrto_SessionId__c: lead.Hyrto_SessionId__c` i samma update.

### ⚠️ Bugg 3 (mindre) — Account.BillingPostalCode sätts till leveranspostnummer

**Reproducerbart:** Test 2. `BillingPostalCode = 41101` (samma som leveransort), trots att kunden angett `billingPostalCode: 11122` (Stockholm).

**Effekt:** B2B-fakturaadress på Account blir fel. Order har dock korrekt billing-fält separat.

**Föreslagen fix:** I `convertLeadToCustomer`, mappa `lead.Hyrto_BillingPostalCode__c`/`BillingStreet`/`BillingCity` till Account.BillingAddress, inte leveranspostnumret.

### ✅ Inga blockerande problem

Dashboarden i Salesforce kommer nu visa data så snart några riktiga leads kommer in via frontend. Tracking-flödet är robust och idempotent.

---

## 5. Rekommenderade nästa steg

1. **Fixa Bugg 1 & 2** — små edits i `api/index.js`, deploy om
2. **Testkör frontend i browser** mot prod-backend (kräver Vercel-deploy av frontend för att kringgå localhost-policyn) för slutvalidering att UI faktiskt skickar samma payload som dessa tester antar
3. **Städa testdata** — 7 leads + 1 konvertering ligger i orgen. Säg till om de ska tas bort (eller använda dem för dashboard-screenshots).
4. **Dashboard-verifiering** — öppna `https://orgfarm-fabd595e73-dev-ed.develop.my.salesforce.com/lightning/r/Dashboard/01Zfj000004qUPVEA2/view` och refresha. Bör nu visa funnel-volymer, dropouts, intäkt, B2C/B2B.

---

## 6. Test-IDs för uppföljning

**Test-leads (kan tas bort efter dashboard-screenshot):**

```
test-1781115216246-t1-b2c-noBooking         00Qfj00000VkrqgEAB
test-1781115216246-t2-b2b-bookingCreated    00Qfj00000Vl09BEAR  (CONVERTED)
test-1781115216246-t3-drop-postalCode       00Qfj00000Vl0CPEAZ
test-1781115216246-t3-drop-dates            00Qfj00000VkATyEAN
test-1781115216246-t3-drop-products         00Qfj00000VkRRmEAN
test-1781115216246-t3-drop-serviceLevel     00Qfj00000VkzReEAJ
test-1781115216246-t4-reentry               00Qfj00000Vl0FdEAJ
```

Plus 7 leads från första testkörningen (`TS=1781115091047`) — den hade fel productId-format, så OrderItems saknas på dess B2B-konvertering. Bör tas bort.

```sql
-- Cleanup query:
SELECT Id, Hyrto_SessionId__c FROM Lead WHERE Hyrto_SessionId__c LIKE 'test-%'
```

---

## 7. Bugg-fixar (verifierade lokalt 2026-06-10 ~20:33)

### Diff i `api/index.js`:

**Fix 1 — RecordType-byte vid update:**
```js
// I POST /api/funnel/track, efter att hitta existing lead:
const targetRt = isB2B ? RT_B2B : RT_B2C;
if (existingLead?.RecordTypeId && existingLead.RecordTypeId !== targetRt) {
  leadFields.RecordTypeId = targetRt;
}
await sf.update('Lead', leadId, leadFields);
```

**Fix 2 — Opp.Hyrto_SessionId__c:**
```js
// I convertLeadToCustomer, Opp-update efter convertLead:
await sf.update('Opportunity', oppId, {
  StageName: 'Closed Won',
  Amount: totalPrice,
  CloseDate: closeDate,
  Hyrto_SessionId__c: lead.Hyrto_SessionId__c || undefined,  // ← NY
});
```

**Fix 3 — Account billing-adress (2 steg):**
- Steg A: Pre-create Business Account innan SOAP convertLead (gör att vi har kontroll över Account-Id + RT).
- Steg B: EFTER convertLead, skriv om Account.Billing* + Hyrto_OrgNumber__c, eftersom convertLead skriver över billing med Lead.Street (leveransadress).

```js
// Efter Opp-update:
if (isB2B && accountId) {
  const accUpdate = {};
  if (lead.Hyrto_BillingStreet__c) accUpdate.BillingStreet = lead.Hyrto_BillingStreet__c;
  if (lead.Hyrto_BillingPostalCode__c) accUpdate.BillingPostalCode = lead.Hyrto_BillingPostalCode__c;
  if (lead.Hyrto_BillingCity__c) accUpdate.BillingCity = lead.Hyrto_BillingCity__c;
  if (lead.Hyrto_BillingOrgNumber__c) accUpdate.Hyrto_OrgNumber__c = lead.Hyrto_BillingOrgNumber__c;
  if (Object.keys(accUpdate).length > 0) await sf.update('Account', accountId, accUpdate);
}
```

Extra-utökat också: `leadQ` SOQL inkluderar nu `Phone, Hyrto_BillingCompanyName__c, Hyrto_BillingStreet__c, Hyrto_BillingPostalCode__c, Hyrto_BillingCity__c`.

### Verifierat lokalt mot prod-org:

| Fix | Test-ID | Resultat |
|---|---|---|
| 1 — RT-switch | Lead `00Qfj00000Vl9CUEAZ` | RT=`Hyrto_B2B_Lead` ✅ |
| 2 — Opp.SessionId | Opp `006fj00000G3MUDAA3` | SessionId=`fix-1781116358855-full-b2b` ✅ |
| 3 — Account billing | Account `001fj00001IewYkAAJ` | BillingStreet=`Fakturavägen 99`, PostalCode=`11122`, City=`Stockholm`, OrgNumber=`5560777666` ✅ |

### Quirks som hittades under fix-utveckling:
- `Account.BillingCountry: 'Sverige'` accepteras EJ — state/country picklist kräver giltigt picklist-värde. Lösning: lämna BillingCountry tomt (default fungerar).
- `convertLead` SOAP skriver över Account.BillingAddress med Lead.Street; alltså måste billing-update göras EFTER konvertering.

### Status:
- Fixarna är pushade till `api/index.js`
- **Inte deployad till Vercel än** — kräver Vercel-credentials (`vercel login` på Boss maskin)
