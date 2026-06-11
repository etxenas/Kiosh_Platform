# Kiosh Platform — Backlog & TODO

_Senast uppdaterad: 2026-06-11_

## 🚧 Pågående / Pausade

### Email-leverans — pausad 2026-06-11
**Status:** Backend har 3-stegs fallback klar; just nu hamnar bekräftelse-mailen som **Task med "📧 Skicka bekräftelse-email…"** på Contacten.

**För att aktivera riktig mail-leverans, välj EN:**

1. **🅰️ Resend (rekommenderat — snabbast)**
   - Skapa konto på https://resend.com (gratis 100 mail/dag, ingen domain-verifiering på `@resend.dev`)
   - Lägg `RESEND_API_KEY=re_xxx` i Vercel env-vars för `salesforce-backend`-projektet
   - Valfritt: `RESEND_FROM="Hyrto <bokningar@dindomän.se>"` (kräver domain-verifiering hos Resend)
   - Backend försöker Resend först → om OK, klart
   - Test: gör en testbokning, kolla att `emailMethod: 'resend'` i conversion-result

2. **🅱️ SF Salesforce-mail med verified domain**
   - Konfigurera Email Deliverability i SF Setup (kräver MX-records för avsändar-domän)
   - Eller skapa OrgWideEmailAddress med verifierad ägare
   - Backend faller tillbaka till `emailSimple` om Resend saknas

3. **🅲️ Process Builder/Flow i SF**
   - Triggar på Task-records med Subject LIKE '📧 Skicka bekräftelse-email%'
   - Vidareskickar Description-content via SF-mail eller extern integration

**Filer:** `backend/api/index.js` (sök `RESEND_API_KEY`)

---

## 💡 Nice-to-have

### Dashboard/admin-vy i appen
- Lead-funnel-rapport (drop-out per steg)
- Aktiva bokningar per hub + asset-utnyttjandegrad
- Idag/imorgon: leveranser/hämtningar
- **Filer:** Behöver ny route `frontend/src/app/admin/page.tsx` + skyddad åtkomst

### Order.TotalAmount räknar bara produkt-rader, inte dagar/leverans
- Just nu: `1500 kr` (1 toalett × 1500 kr/dag, oavsett dagar)
- Riktig: dagar × pris + leverans (med långhyra-rabatt)
- **Lösning:** Quantity = antal dagar (men då tappar vi "antal toaletter"-rapport)
- **Alt:** Lämna som-är, använd `Hyrto_Booking__c.TotalPrice__c` som facit
- **Beslut tas senare**

### Premium/HCP/Lyx-priser matchar inte Sanifix än
- Standard = 974 kr/dag (Sanifix Holken-matchat)
- Premium 1500 / HCP 1800 / Lyx 2500 — från samples, ej marknadsverifierade
- När vi vet Sanifix Premium/HCP-priser, uppdatera PricebookEntry
- Långhyra-rabatten 50 kr/dag gäller alla modeller från dag 5

### Service-level-priser i SF istället för hårdkodade
- Just nu i `frontend/src/lib/api.ts` `SERVICE_LEVELS`-array
- Borde vara Product2 med Family='Tjänst' + PricebookEntry
- Då kan Boss ändra pris utan deploy

### Skapa Asset-allokerings-endpoint i backend
- `/api/catalog/allocate-asset?hubId=&productId=&from=&to=` — returnerar en specifik Available Asset-id
- Just nu reservation görs bara i convertLead-flödet; om någon vill testa Booking-skapande från admin behövs detta

### Riktig svensk postnummer-distans
- Just nu: ~85 hardcoded centroider per postnummer-prefix (2 siffror)
- Riktig prod: Google Maps Distance Matrix API
- **Filer:** `frontend/src/lib/catalog.ts` `PC_CENTROIDS`

### Lyxtoalett i Stockholm Norr
- Just nu 0 st seedade — kunden tvingas till Stockholm Syd (5 km, 800 kr)
- Lägg till 1-2 Lyx-Assets på Norr-hub om verksamheten har det

### Custom Hyrto_Booking__c-fält saknas
- `Hyrto_Order__c` (Lookup → Order) — för bakåt-länk (idag pekar Order → Booking men inte tvärtom)
- `Hyrto_OrderItem__c` (Lookup → OrderItem) — koppla varje booking till sin rad

### Cancellation-flow
- Kund får bokningsnummer på confirmation-sidan men ingen självservice-länk för att avboka
- Behövs: `/avboka?id=BOOK-XXX` med signerad token i email-bekräftelsen

---

## 🐛 Kända småbuggar

- Submit-knappen "Skicka bokning" kräver ibland två klick (race med form-validation)
- Browser-test misslyckas att klicka cards via koordinat-clicks (måste gå via querySelector → click())

---

## 🔒 Säkerhet (kvar från 2026-06-10)

- ⚠️ **Rotera SF Consumer Secret + byt SF-lösenord** innan produktion
- ⚠️ Lade Connected App-credentials i workspace tidigare → assume compromised

---

## ✅ Genomfört nyligen (2026-06-11)

- Postort-autofyll från postnummer
- Riktig SF-katalog (hubs/products/addons/availability) ersatt mock-data
- Asset.Hyrto_Hub__c custom field + 25 seedade Assets
- Asset-reservation vid konvertering (Booking per fysisk Asset)
- Order.Hyrto_Booking__c lookup
- Contract auto-skapas + aktiveras
- Distance/DeliveryFee propageras Lead → Order → Booking
- Hub-val gömt i UI, auto-byte med varning vid behov
- Email-fallback (Task på Contact) [riktig leverans pausad]
- **Sanifix-matchad prismodell:**
  - Standardtoalett 974 kr/dag (Sanifix Holken 3896/4)
  - Extrastädning 1948 kr/tillfälle
  - Långhyra-rabatt: dag 5+ kostar 50 kr/dag/st (matchar Sanifix exakt)
  - StepReview visar uppdelningen 'Dag 1-4' + 'Dag 5+' tydligt
  - Marknadsanalys-Excel uppdaterad i `docs/marknadsanalys/`
