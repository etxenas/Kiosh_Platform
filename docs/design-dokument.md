# Hyrtoaletter — Systemdesign & Arkitektur v2

> **Projekt:** Webbplats för marknadsföring och bokning av hyrtoaletter  
> **Backend:** Salesforce (CRM + data + automation)  
> **Målgrupp:** MVP — enkel, snabb bokning med direkt pris  
> **Senast uppdaterad:** 2026-05-31 v2.1 (Frontend uppdaterad med komplett hub-modell)

---

## 1. Övergripande arkitektur

```
┌──────────────────────┐
│   Kund (webbläsare)   │
└──────────┬───────────┘
           │ HTTPS
           ▼
┌──────────────────────┐      ┌──────────────────────┐
│   Frontend (Next.js)  │─────▶│  Salesforce REST API  │
│   Host: Vercel        │      │  (headless backend)   │
└──────────────────────┘      └──────────┬───────────┘
           │                             │
           │ Google Maps API             ├── Data (Products, Assets, Hubs, Bookings)
           │ (avståndsberäkning)         ├── Flow Automation
           │                             ├── Scrive (avtal)
           │                             └── Email/SMS
           ▼
┌──────────────────────┐
│   Google Maps         │
│   Distance Matrix     │
│   (kostnadsfri nivå)  │
└──────────────────────┘
```

---

## 2. Datamodell (ER-diagram v2)

```
                        ┌──────────────────────┐
                        │      PRODUCT          │
                        │  (Standardobjekt)     │
                        ├──────────────────────┤
                        │ Id                   │
                        │ Name                 │  "Premiumtoalett"
                        │ ProductCode          │  "TOA-PRE"
                        │ Family               │  "Toalett" | "Tillval" | "Tjänst"
                        │ Description          │
                        │ IsActive             │
                        └──────────┬───────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │ N            │ N            │ N
                    ▼              ▼              ▼
     ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
     │   PRICEBOOKENTRY  │  │     ASSET        │  │ OPPORTUNITYLINE  │
     │  (Standardobjekt) │  │  (Standardobjekt)│  │    ITEM          │
     ├──────────────────┤  ├──────────────────┤  │  (Standardobjekt)│
     │ Id               │  │ Id               │  ├──────────────────┤
     │ Product2Id ──────┤  │ Name (Auto)      │  │ OpportunityId     │
     │ UnitPrice        │  │ Product2Id ──────┤  │ Product2Id ──────┤
     └──────────────────┘  │ SerialNumber     │  │ Quantity          │
                           │ Status           │  │ UnitPrice         │
                           │ PurchaseDate     │  └──────────────────┘
                           │ Hub__c ──────┐   │
                           │ Location__c  │   │
                           │ Notes__c     │   │
                           └──────────────┼───┘
                                          │ N
                                          │
                                          │ 1
                           ┌──────────────┴──────────────┐
                           │         HUB__c              │
                           │      (Custom Object)        │
                           ├─────────────────────────────┤
                           │ Id                          │
                           │ Name                        │  "Göteborg"
                           │ Address__c (TextArea)       │
                           │ PostalCode__c               │  "411 10"
                           │ MaxDeliveryRadiusKm__c      │  80
                           │ IsActive__c                 │  true
                           │ BaseDeliveryFee__c          │  800  (0-20 km)
                           │ MediumDeliveryFee__c        │  1500 (20-50 km)
                           │ FarDeliveryFee__c           │  2500 (50-80 km)
                           │ MediumRadiusKm__c           │  20
                           │ FarRadiusKm__c              │  50
                           └─────────────────────────────┘


                        ┌──────────────────────┐
                        │     ACCOUNT           │
                        │  (Standardobjekt)     │
                        ├──────────────────────┤
                        │ Id                   │
                        │ Name (företag/privat)│
                        │ Phone                │
                        │ BillingAddress       │
                        └──────────┬───────────┘
                                   │ 1
                                   │ N
                        ┌──────────┴───────────┐
                        ▼                      ▼
             ┌──────────────────┐   ┌──────────────────┐
             │    CONTACT       │   │   OPPORTUNITY    │
             │ (Standardobjekt) │   │ (Standardobjekt) │
             ├──────────────────┤   ├──────────────────┤
             │ Id               │   │ Id               │
             │ AccountId ───────┤   │ AccountId ───────┤
             │ FirstName        │   │ ContactId ───────┤
             │ LastName         │   │ Name (Auto)      │
             │ Email            │   │ StageName        │
             │ Phone            │   │ CloseDate        │
             └──────────────────┘   │ Amount           │
                                    └────────┬─────────┘
                                             │ 1
                                             │ N
                                    ┌────────┴─────────┐
                                    ▼                  ▼
                         ┌──────────────────┐  ┌──────────────────┐
                         │  BOOKING_SLOT__c │  │     ORDER        │
                         │  (Custom)        │  │ (Standardobjekt) │
                         ├──────────────────┤  └──────────────────┘
                         │ Id               │
                         │ Asset__c (Lookup)│
                         │ Hub__c (Lookup)  │
                         │ Opportunity__c   │
                         │ Contact__c       │
                         │ StartDateTime__c │
                         │ EndDateTime__c   │
                         │ Status__c        │
                         │ CustomerPostalCode__c │
                         │ DeliveryAddress__c    │
                         │ DeliveryNotes__c      │
                         │ DeliveryDistanceKm__c │
                         │ DeliveryFee__c        │
                         │ BasePrice__c          │
                         │ TotalPrice__c         │
                         └──────────────────┘


                        ┌──────────────────────┐
                        │  ADDON_PRODUCT__c     │
                        │  (Custom Junction)    │
                        ├──────────────────────┤
                        │ Id                   │
                        │ BookingSlot__c       │
                        │ Product__c (Lookup)  │
                        │ Quantity__c          │
                        │ UnitPrice__c         │
                        │ TotalPrice__c        │
                        └──────────────────────┘


                        ┌──────────────────────┐
                        │  SERVICE_LOG__c       │
                        │  (Custom)            │
                        ├──────────────────────┤
                        │ Id                   │
                        │ Asset__c (Lookup)    │
                        │ BookingSlot__c       │
                        │ ServiceType__c       │
                        │ ServiceDate__c       │
                        │ Notes__c             │
                        │ PerformedBy__c       │
                        │ Cost__c              │
                        └──────────────────────┘
```

---

## 3. Hub-modellen (hjärtat i leveranslogiken)

### Hub__c — Custom Object

| Fält | Typ | Beskrivning | Exempel |
|---|---|---|---|
| Name | Text (80) | Hub-namn | "Göteborg" |
| Address__c | TextArea | Hubens adress | "Lager 4, Exportgatan 15" |
| PostalCode__c | Text (10) | Utgångspostnummer för avståndsberäkning | "411 10" |
| MaxDeliveryRadiusKm__c | Number | **Hård gräns** — längre än detta = ingen leverans | 80 |
| MediumRadiusKm__c | Number | Gräns mellan bas- och medium-pris | 20 |
| FarRadiusKm__c | Number | Gräns mellan medium- och långdistans-pris | 50 |
| BaseDeliveryFee__c | Currency | Leveransavgift 0-MediumRadiusKm | 800 |
| MediumDeliveryFee__c | Currency | Leveransavgift MediumRadiusKm-FarRadiusKm | 1500 |
| FarDeliveryFee__c | Currency | Leveransavgift FarRadiusKm-MaxDeliveryRadiusKm | 2500 |
| IsActive__c | Checkbox | Aktiv/inaktiv | true |

### Asset — uppdateras med Hub-relation

| Fält | Typ | Nytt/Befintligt |
|---|---|---|
| Hub__c | Lookup(Hub__c) | **NYTT** — vilken hub tillhör toaletten |

### Booking_Slot__c — uppdaterade fält

| Fält | Typ | Nytt/Befintligt |
|---|---|---|
| Hub__c | Lookup(Hub__c) | **NYTT** — från vilken hub levereras |
| CustomerPostalCode__c | Text | **NYTT** — kundens postnummer |
| DeliveryDistanceKm__c | Number | **NYTT** — beräknat avstånd |
| DeliveryFee__c | Currency | **NYTT** — beräknad fraktkostnad |

---

## 4. Avståndslogik (Google Maps Distance Matrix)

```
1. Kund anger postnummer → geokodas till lat/lng via Google Geocoding API
2. Jämför med alla aktiva hubars PostalCode__c → hub-lat/lng
3. Google Distance Matrix returnerar köravstånd i km
4. Filtrera hubar ≤ MaxDeliveryRadiusKm → sortera närmast först
5. Kolla tillgänglighet på närmaste hub
6. Om slut → kolla nästa hub, osv
7. Om ingen hub har alla toaletter → "Ej tillgängligt för din adress"
```

### Prisberäkning per avstånd

```
Avstånd ≤ MediumRadiusKm        → BaseDeliveryFee
MediumRadiusKm < Avstånd ≤ FarRadiusKm → MediumDeliveryFee
FarRadiusKm < Avstånd ≤ MaxDeliveryRadiusKm → FarDeliveryFee
Avstånd > MaxDeliveryRadiusKm   → "Leverar inte hit"
```

---

## 5. Bokningsflöde (uppdaterat)

### Steg 1: Postnummer 🆕
Kund anger postnummer → systemet hittar tillgängliga hubar

### Steg 2: Datum 📅
Välj start/slutdatum

⚠️ **Express-regel:** Om startdatum är ≤ 3 dagar från idag →
- Expressavgift på 500 kr tillkommer
- Ordern måste ringas in och bekräftas manuellt
- Visas tydligt i bokningsflödet

### Steg 3: Toaletter 🚽
Visa tillgängliga toaletter från vald hub, multi-select med kvantitet

### Steg 4: Tillval 🎁
Tillval per vald toalettmodell

### Steg 5: Översikt 💰
Pris inkl. avståndsbaserad frakt

### Steg 6: Kontakt 📝
Kunduppgifter + leveransadress

### Steg 7: Bekräftelse 🎉

---

## 6. Prismodell

### Produkt-hierarki
```
├── Toaletter
│   ├── Premiumtoalett          → från 1 500 kr/dag
│   ├── Standardtoalett         → från   900 kr/dag
│   ├── Handikapptoalett        → från 1 800 kr/dag
│   └── Lyxtoalett              → från 2 500 kr/dag
├── Tillval
│   ├── Handfat                 →   200 kr/dag
│   ├── Värmefläkt              →   150 kr/dag
│   ├── Belysningspaket         →   100 kr/dag
│   └── Extrastädning           →   500 kr/tillfälle
└── Frakt (avståndsbaserat)
    ├── När (0-20 km)           →   800 kr
    ├── Mellan (20-50 km)       → 1 500 kr
    └── Långt (50-80 km)        → 2 500 kr
└── Expressavgift
    └── Beställning ≤ 3 dagar   →   500 kr (kräver manuell bekräftelse via telefon)
```

### Totalpris
```
Totalpris = Σ(produktpris × dagar × kvantitet)
          + Σ(tillval × dagar × kvantitet)
          + Fraktavgift (avståndsbaserat från hub)
          + Expressavgift (om ≤ 3 dagar till leverans)
```

---

## 7. Automation (Salesforce Flow)

### Flow 1: Asset Status Sync
```
Booking_Slot__c skapas/uppdateras
→ Status__c = "Bokad" → Asset.Status = "Bokad"
→ Status__c = "Utkörd" → Asset.Status = "Uthyrd"
→ Status__c = "Återlämnad" → Asset.Status = "Tillgänglig"
```

### Flow 2: Bokningsbekräftelse
```
Booking_Slot__c.Status__c = "Bekräftad"
→ Skicka email med bokningsdetaljer + leveransinfo + hub
```

### Flow 3: Hub-tillgänglighetsöversikt (Scheduled)
```
Dagligen: rapportera Assets per Hub, status, bokningsgrad
```

---

## 8. SOQL-exempel

### Hitta tillgängliga assets från en hub

```sql
SELECT Id, Name, SerialNumber, Hub__c
FROM Asset
WHERE Product2Id = 'premiumtoalett'
  AND Status = 'Tillgänglig'
  AND Hub__c = 'hub-goteborg'
  AND Id NOT IN (
    SELECT Asset__c FROM Booking_Slot__c
    WHERE StartDateTime__c < :endDate
      AND EndDateTime__c > :startDate
      AND Status__c NOT IN ('Avbokad')
  )
```

### Hitta hubar inom leveransradie

```sql
SELECT Id, Name, PostalCode__c, MaxDeliveryRadiusKm__c,
       BaseDeliveryFee__c, MediumDeliveryFee__c, FarDeliveryFee__c
FROM Hub__c
WHERE IsActive__c = true
ORDER BY Name
```

(Avståndsfiltrering sker i applikationslogik via Google Maps API)

---

## 9. Teknisk stack

| Lager | Teknik | Hosting |
|---|---|---|
| Frontend | Next.js 14+ (App Router) + Tailwind CSS | Vercel |
| Avstånd | Google Maps Geocoding + Distance Matrix API | Google Cloud |
| Backend/Data | Salesforce REST API + SOQL | Salesforce |
| Automation | Salesforce Flow | Salesforce |
| Avtal | Scrive API (framtida) | Scrive |
| Betalning | Stripe (framtida) | Stripe |

---

## 10. MVP Scope v2

### ✅ Klart
- [x] Startsida med festival-design
- [x] Bokningsflöde (postnummer → datum → toaletter multi → tillval per modell → översikt → kund → bekräftelse)
- [x] Direkt pris med tillval + avståndsbaserad frakt
- [x] Hub-modell med tillgänglighetskoll per hub
- [x] Mock-avståndsberäkning (ersätts med Google Maps)
- [x] Deployat på Vercel

### 🔜 Kommande
- [ ] Google Maps Distance Matrix API (ersätter mock-avstånd)
- [ ] Salesforce-integration (väntar på Dev Edition)
- [ ] Scrive-avtal
- [ ] Betalning (Stripe)
- [ ] Admin-gränssnitt för hub-hantering

---

*Dokument skapat: 2026-05-30 | Senast uppdaterat: 2026-05-31 v2.1*
