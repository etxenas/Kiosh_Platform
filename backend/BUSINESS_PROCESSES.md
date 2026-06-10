# Kiosh — Affärsprocesser & Systemdokumentation

## Översikt

**Kiosh** är ett hyrsystem för mobila toaletter. Kunder bokar toaletter för evenemang, byggarbetsplatser och tillfälliga behov. Systemet hanterar hubbar (depåer), bokningar, avsyningar, servicescheman, tilläggsprodukter och service.

## Affärsprocesser

### 1. Bokningsprocessen (Kärnprocess)

```
Kundförfrågan → Bokning → Utleveransavsyning → Leverans → Återlämning → Inleveransavsyning → Tvätt/genomgång → Avslutad
```

**Steg för steg:**

1. **Kundförfrågan** — Kunden kontaktar Kiosh via telefon, mail eller webb
2. **Tillgänglighetskontroll** — Sök lediga toaletter: `GET /api/availability`
3. **Skapa bokning** — `POST /api/bookings` med Service nivå (Bas/Standard/Premium)
4. **Bekräftelse** — Status → Bekräftad
5. **Utleveransavsyning** — Checklistekontroll innan toaletten lämnar hubben: `POST /api/inspections` med Type=Utleverans
6. **Leverans** — Status → Levererad, kund kvitterar med signatur
7. **Servicebesök** (långtidshyra) — Automatgenererat schema: `POST /api/bookings/:id/generate-schedule`
8. **Inleveransavsyning** — Checklistekontroll när toaletten hämtas: `POST /api/inspections` med Type=Inleverans
9. **Tvätt/genomgång** — Status → Tvätt/genomgång, intern process på hubben
10. **Avslutad** — Toaletten återställd, Asset status → Available

### Bokningsstatusar

| Status | Beskrivning |
|--------|-------------|
| Bokad | Initial bokning, ännu inte bekräftad |
| Bekräftad | Bokningen bekräftad med kunden |
| **Utleverans** | **Avsyning pågår/klar, redo att leverera** |
| Levererad | Toaletten är hos kunden |
| **Inleverans** | **Avsyning vid retur pågår** |
| **Tvätt/genomgång** | **Toaletten saneras på hubben** |
| Avslutad | Toaletten återställd och tillgänglig |
| Avbokad | Bokningen avbokad |

### Service nivåer

| Nivå | Tömningsintervall | Städning | Vattenpåfyllning | Pris |
|------|-------------------|----------|-----------------|------|
| **Bas** | Ingen service (korttid) | Ingen | Ej inkluderat | Grundpris |
| **Standard** | Var 48:e timme | Avtorkning vid tömning | Tillägg 150 kr/besök | +20% |
| **Premium** | Var 24:e timme | Full städ + påfyllning | Inkluderat | +40% |

### 2. Avsyning (Inspection)

Avsyning är **kritisk** för affären. Den fastställer skicket vid utleverans och retur, vilket avgör ansvarsfördelning vid skador.

#### Utleveransavsyning (innan toaletten lämnar hubben)

| Checklista | Fält |
|-----------|------|
| Rent inuti (1-5) | CleanInterior__c |
| Rent utvändigt (1-5) | CleanExterior__c |
| Vattentank full | WaterTankFull__c |
| Pappershållare fylld | PaperHolderFull__c |
| Dörr/lås fungerar | DoorLockOK__c |
| Ventilation OK | VentilationOK__c |
| Skador? → Fotodok | DamagesFound__c + DamagePhotoUrl__c |
| Övergripande skick | OverallCondition__c (Rent/OK/Smutsigt/Skadat) |
| Kundkvittering | CustomerSignature__c |

#### Inleveransavsyning (när toaletten hämtas från kund)

Samma checklista PLUS:
- **Extrakostnader** baserade på smutsighet:
  - Nivå 1-2: Ingen extrakostnad
  - Nivå 3: Extrastädning 500 kr
  - Nivå 4-5: Extrastädning 800 kr + eventuell skadeersättning

### 3. Serviceschema (Service Schedule)

Automatgenererat baserat på bokningens Service nivå:

- **Bas** (hyra ≤ 1 dag): Inget schema
- **Standard** (hyra > 1 dag): Tömning + avtorkning var 48:e timme
- **Premium** (hyra > 1 dag): Full städning var 24:e timme + vattenpåfyllning

```
POST /api/bookings/:id/generate-schedule
→ Skapar automatiskt Hyrto_ServiceSchedule__c poster
```

Varje servicebesök har:
- Planerat datum (ScheduledDate__c)
- Service typ (Tömning/Tömning+avtorkning/Full städning/Vattenpåfyllning)
- Status (Planerad/Genomförd/Avbokad)
- Utfört av (PerformedBy__c)

### 4. Hubbhantering

Hubbar är depåer där toaletter förvaras och underhålls. Varje hubb har leveranszoner med tre prismodeller.

### 5. Tilläggsprodukter (Addons)

Till varje bokning kan kunden lägga till extra produkter/tjänster.

### 6. Prismodell

```
Totalpris = Grundpris + Leveransavgift + Σ(Tilläggsprodukter) + Extrakostnader (avsyning)
```

### 7. Hyrobjekt (Assets)

Varje toalett är en Asset med Status (Available/In Use/Maintenance/Retired).

---

## API-översikt

### Endpoints

| Endpoint | Metod | Beskrivning |
|----------|--------|-------------|
| `/api/hubs` | GET, POST | Lista/skapa hubbar |
| `/api/hubs/:id` | GET, PATCH, DELETE | Läs/uppdatera/radera hubb |
| `/api/assets` | GET, POST | Lista/skapa hyrobjekt |
| `/api/assets/:id` | GET, PATCH, DELETE | Läs/uppdatera/radera hyrobjekt |
| `/api/bookings` | GET, POST | Lista/skapa bokningar |
| `/api/bookings/:id` | GET, PATCH, DELETE | Läs/uppdatera/radera bokning |
| `/api/bookings/:id/generate-schedule` | POST | Auto-generera serviceschema |
| `/api/availability` | GET | Sök tillgängliga toaletter |
| `/api/inspections` | GET, POST | Lista/skapa avsyningar |
| `/api/inspections/:id` | GET, PATCH, DELETE | Läs/uppdatera/radera avsyning |
| `/api/service-schedules` | GET, POST | Lista/skapa servicescheman |
| `/api/service-schedules/:id` | GET, PATCH, DELETE | Läs/uppdatera/radera serviceschema |
| `/api/addons` | GET, POST | Lista/skapa tilläggsprodukter |
| `/api/addons/:id` | DELETE | Radera tilläggsprodukt |
| `/api/service-logs` | GET, POST | Lista/skapa serviceloggar |
| `/api/service-logs/:id` | DELETE | Radera servicelogg |
| `/api/health` | GET | Hälsokontroll |
| `/api/query` | GET | Fri SOQL-fråga |

---

## Dataobjekt

### Hyrto_Inspection__c (Avsyning)

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| Name | Auto | Avsynings-ID (INS-0000) |
| Booking__c | Lookup→Hyrto_Booking__c | Vilken bokning |
| Asset__c | Lookup→Asset | Vilken toalett |
| Type__c | Picklist | Utleverans/Inleverans |
| InspectionDate__c | DateTime | Datum/tid för avsyning |
| Inspector__c | Text | Avsynd person |
| CleanInterior__c | Number(1,0) | Inre renhet (1-5) |
| CleanExterior__c | Number(1,0) | Yttre renhet (1-5) |
| WaterTankFull__c | Checkbox | Vattentank full? |
| PaperHolderFull__c | Checkbox | Pappershållare fylld? |
| DoorLockOK__c | Checkbox | Dörr/lås fungerar? |
| VentilationOK__c | Checkbox | Ventilation OK? |
| DamagesFound__c | Checkbox | Skador hittade? |
| DamageNotes__c | LongTextArea | Skadebeskrivning |
| DamagePhotoUrl__c | URL | Fotolänk |
| OverallCondition__c | Picklist | Rent/OK/Smutsigt/Skadat |
| ExtraCleaningNeeded__c | Checkbox | Extra städning behövs? |
| ExtraCleaningFee__c | Currency | Extrakostnad städning |
| CustomerSignature__c | Text | Kundens kvittering |
| Notes__c | LongTextArea | Anteckningar |

### Hyrto_ServiceSchedule__c (Serviceschema)

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| Name | Auto | Schema-ID (SCH-0000) |
| Booking__c | Lookup→Hyrto_Booking__c | Vilken bokning |
| Asset__c | Lookup→Asset | Vilken toalett |
| Hub__c | Lookup→Hyrto_Hub__c | Vilken hubb |
| ScheduledDate__c | DateTime | Planerat datum/tid |
| ServiceType__c | Picklist | Tömning/Tömning+avtorkning/Full städning/Vattenpåfyllning/Underhåll |
| Status__c | Picklist | Planerad/Genomförd/Avbokad |
| CompletedDate__c | DateTime | Faktiskt genomförddatum |
| PerformedBy__c | Text | Utfört av |
| Notes__c | LongTextArea | Anteckningar |

### Hyrto_Booking__c (Bokning) — Nya fält

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| ServiceLevel__c | Picklist | Bas/Standard/Premium |
| ServiceIntervalHours__c | Number(3,0) | Timmar mellan service |
| IncludesWaterRefill__c | Checkbox | Vattenpåfyllning inkluderat? |
| IncludesCleaning__c | Checkbox | Städservice inkluderat? |

### Bokningsstatusar (uppdaterade)

| Status | Beskrivning |
|--------|-------------|
| Bokad | Initial bokning |
| Bekräftad | Bekräftad med kunden |
| Utleverans | Avsyning pågår/klar |
| Levererad | Toaletten hos kunden |
| Inleverans | Avsyning vid retur |
| Tvätt/genomgång | Toaletten saneras |
| Avslutad | Återställd och tillgänglig |
| Avbokad | Bokningen avbokad |

---

## Affärsregler

### Tömningsintervall
- Hyresperiod ≤ 1 dag → Ingen service (engångsbruk)
- Hyresperiod 2-7 dagar → Tömning var 48:e timme (Standard)
- Hyresperiod > 7 dagar → Var 24:e timme (Premium) eller var 48:e (Standard)

### Städservice
- Bas: Ingen städning under hyresperioden
- Standard: Avtorkning vid varje tömningsbesök
- Premium: Full städning vid varje servicebesök

### Vattenpåfyllning
- Standard: Inte inkluderat, tillägg 150 kr/besök
- Premium: Inkluderat

### Extra städning vid retur
- Smutsighet nivå 1-2 → Ingen extrakostnad
- Smutsighet nivå 3 → Extrastädning 500 kr
- Smutsighet nivå 4-5 → Extrastädning 800 kr + eventuell skadeersättning

### Skador vid retur
- Mindre skador (repor, fläckar) → Debiteras med faktiskt kostnad
- Större skador (trasig dörr, vattenskada) → Debiteras separat

### Toaletten MÅSTE gå igenom full tvätt/genomgång innan den blir "Available"

---

## Testdata

### Avsyningar
| ID | Typ | Skick | Skador | Signatur |
|----|------|-------|--------|----------|
| INS-0000 | Utleverans | Rent | Nej | Anders Johansson |
| INS-0001 | Inleverans | OK | Ja (repa) | — |

### Servicescheman
| ID | Typ | Datum | Hub | Status |
|----|------|------|-----|--------|
| SCH-0000 | Tömning+avtorkning | 13 jun 08:00 | Stockholm Central | Planerad |
| SCH-0001 | Tömning+avtorkning | 14 jun 08:00 | Stockholm Central | Planerad |
| (auto) | Full städning | 21 jun 06:00 | Malmö Syd | Planerad |

### Bokningar (uppdaterade med Service nivå)
| Kund | Hub | Nivå | Intervall | Status |
|------|-----|------|-----------|--------|
| Anders Johansson | Stockholm | Standard | 48h | Bekräftad |
| Maria Svensson | Göteborg | Standard | 48h | Bokad |
| Byggbolaget AB | Malmö | Premium | 24h | Bokad |