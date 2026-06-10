# Kiosh Salesforce Backend — API Reference

**Base URL:** `http://localhost:3200`
**Auth:** Client Credentials → Bearer token (handled by server)

## Objects & Fields

| Object | API Name | Fields |
|--------|----------|--------|
| Hub | Hyrto_Hub__c | Name, Address__c, PostalCode__c, IsActive__c, BaseDeliveryFee__c, MediumDeliveryFee__c, FarDeliveryFee__c, MediumRadiusKm__c, FarRadiusKm__c, MaxDeliveryRadiusKm__c |
| Booking | Hyrto_Booking__c | Name, Hub__c, Asset__c, StartDateTime__c, EndDateTime__c, Status__c, CustomerName__c, CustomerEmail__c, CustomerPhone__c, DeliveryAddress__c, CustomerPostalCode__c, DistanceKm__c, DeliveryFee__c, DeliveryNotes__c, BasePrice__c, TotalPrice__c, **ServiceLevel__c**, **ServiceIntervalHours__c**, **IncludesWaterRefill__c**, **IncludesCleaning__c** |
| Inspection | Hyrto_Inspection__c | Name, Booking__c, Asset__c, Type__c (Utleverans/Inleverans), InspectionDate__c, Inspector__c, CleanInterior__c, CleanExterior__c, WaterTankFull__c, PaperHolderFull__c, DoorLockOK__c, VentilationOK__c, DamagesFound__c, DamageNotes__c, DamagePhotoUrl__c, OverallCondition__c, ExtraCleaningNeeded__c, ExtraCleaningFee__c, CustomerSignature__c, Notes__c |
| Service Schedule | Hyrto_ServiceSchedule__c | Name, Booking__c, Asset__c, Hub__c, ScheduledDate__c, ServiceType__c, Status__c, CompletedDate__c, PerformedBy__c, Notes__c |
| Addon | Hyrto_Addon__c | Name, Booking__c, ProductName__c, Quantity__c, UnitPrice__c, TotalPrice__c, Description__c |
| Service Log | Hyrto_ServiceLog__c | Name, Asset__c, Booking__c, ServiceType__c, ServiceDate__c, PerformedBy__c, Cost__c, Notes__c |

## Endpoints

### Hubs
- `GET /api/hubs` — List all hubs
- `GET /api/hubs/:id` — Get hub by ID
- `POST /api/hubs` — Create hub
- `PATCH /api/hubs/:id` — Update hub
- `DELETE /api/hubs/:id` — Delete hub

### Assets
- `GET /api/assets` — List assets
- `GET /api/assets/:id` — Get asset
- `POST /api/assets` — Create asset (body: name, model, serialNumber, hubId, location, notes)
- `PATCH /api/assets/:id` — Update asset
- `DELETE /api/assets/:id` — Delete asset

### Bookings
- `GET /api/bookings` — List bookings (query: hubId, assetId, fromDate, toDate, status)
- `GET /api/bookings/:id` — Get booking
- `POST /api/bookings` — Create booking
- `PATCH /api/bookings/:id` — Update booking (includes ServiceLevel, ServiceInterval, etc.)
- `DELETE /api/bookings/:id` — Delete booking
- **`POST /api/bookings/:id/generate-schedule`** — Auto-generate service schedule based on service level

### Inspections (Avsyningar)
- `GET /api/inspections` — List inspections (query: bookingId, assetId, type)
- `GET /api/inspections/:id` — Get inspection
- `POST /api/inspections` — Create inspection
- `PATCH /api/inspections/:id` — Update inspection
- `DELETE /api/inspections/:id` — Delete inspection

### Service Schedules (Servicescheman)
- `GET /api/service-schedules` — List schedules (query: bookingId, assetId, hubId, status, fromDate, toDate)
- `GET /api/service-schedules/:id` — Get schedule
- `POST /api/service-schedules` — Create schedule
- `PATCH /api/service-schedules/:id` — Update schedule (mark completed, etc.)
- `DELETE /api/service-schedules/:id` — Delete schedule

### Availability
- `GET /api/availability?fromDate=...&toDate=...&hubId=...&assetId=...` — Check availability

### Addons
- `GET /api/addons?bookingId=...` — List addons
- `POST /api/addons` — Create addon
- `DELETE /api/addons/:id` — Delete addon

### Service Logs
- `GET /api/service-logs?assetId=...&bookingId=...` — List service logs
- `POST /api/service-logs` — Create log
- `DELETE /api/service-logs/:id` — Delete log

### Generic CRUD
- `GET /api/objects?q=Hyrto` — List sobjects
- `GET /api/objects/:name/describe` — Describe object
- `POST /api/objects/:name` — Create record
- `GET /api/objects/:name/:id` — Get record
- `PATCH /api/objects/:name/:id` — Update record
- `DELETE /api/objects/:name/:id` — Delete record
- `GET /api/query?q=SELECT...` — SOQL query
- `GET /api/limits` — Org limits

### Health
- `GET /api/health` — Health check
- `GET /api/org` — Org info

## Booking Status Flow

```
Bokad → Bekräftad → Utleverans → Levererad → Inleverans → Tvätt/genomgång → Avslutad
                                                                     ↘ Avbokad
```

## Service Level Options

| Level | Interval | Cleaning | Water Refill |
|-------|----------|----------|--------------|
| Bas | None (short-term) | None | Not included |
| Standard | 48h | Wipe-down | +150 kr/visit |
| Premium | 24h | Full clean | Included |

## Generate Schedule

```bash
# Auto-generate service schedule for a booking
curl -X POST http://localhost:3200/api/bookings/:id/generate-schedule

# Response:
{
  "message": "3 servicebesök genererade",
  "interval": "48h",
  "serviceLevel": "Standard",
  "schedules": [...]
}
```

## Inspection Example

```bash
# Create delivery inspection
curl -X POST http://localhost:3200/api/inspections \
  -H "Content-Type: application/json" \
  -d '{
    "Booking__c": "a05fj...",
    "Asset__c": "02ifj...",
    "Type__c": "Utleverans",
    "InspectionDate__c": "2026-06-12T07:30:00Z",
    "Inspector__c": "Kalle Anka",
    "CleanInterior__c": 5,
    "CleanExterior__c": 5,
    "WaterTankFull__c": true,
    "PaperHolderFull__c": true,
    "DoorLockOK__c": true,
    "VentilationOK__c": true,
    "DamagesFound__c": false,
    "OverallCondition__c": "Rent",
    "CustomerSignature__c": "Anders Johansson"
  }'
```

## Test Data
- **Stockholm Central** (a06fj00000Fx39JAAR) — Storgatan 15, 11123 | Leverans: 150/250/400 kr
- **Göteborg Central** (a06fj00000FwAJMAA3) — Avenyn 12, 41101 | Leverans: 175/275/450 kr
- **Malmö Syd** (a06fj00000Fwg6IAAR) — Södergatan 8, 21112 | Leverans: 200/300/500 kr
- 3 bookings, 5 addons, 2 service logs, 2 inspections, 3 service schedules