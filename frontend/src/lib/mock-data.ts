// Mock-data med hub-modell — ersätts med Salesforce + Google Maps API

import { Product, Asset, Hub, SelectedProduct } from './types';

export const products: Product[] = [
  { id: '01t-001', name: 'Premiumtoalett', productCode: 'TOA-PRE', family: 'Toalett', description: 'Rymlig premiumtoalett med handfat, spegel och belysning. Perfekt för bröllop och fester.', pricePerDay: 1500 },
  { id: '01t-002', name: 'Standardtoalett', productCode: 'TOA-STD', family: 'Toalett', description: 'Pålitlig standardtoalett för evenemang. Enkel, ren och funktionell.', pricePerDay: 900 },
  { id: '01t-003', name: 'Handikapptoalett', productCode: 'TOA-HCP', family: 'Toalett', description: 'Rullstolsanpassad toalett med bred dörr, stödhandtag och gott om utrymme.', pricePerDay: 1800 },
  { id: '01t-004', name: 'Lyxtoalett', productCode: 'TOA-LYX', family: 'Toalett', description: 'Vår lyxigaste modell med marmorlook, musiksystem och luftkonditionering.', pricePerDay: 2500 },
];

export const addonProducts: Product[] = [
  { id: '01t-010', name: 'Handfat', productCode: 'ADD-HANDFAT', family: 'Tillval', description: 'Extra handfat med tvål och handdukar.', pricePerDay: 200 },
  { id: '01t-011', name: 'Värmefläkt', productCode: 'ADD-VARME', family: 'Tillval', description: 'Värmefläkt för kalla dagar.', pricePerDay: 150 },
  { id: '01t-012', name: 'Belysningspaket', productCode: 'ADD-LJUS', family: 'Tillval', description: 'Extra belysning runt och inuti toaletten.', pricePerDay: 100 },
  { id: '01t-013', name: 'Extrastädning', productCode: 'ADD-STAD', family: 'Tillval', description: 'Extra städning under uthyrningsperioden (per tillfälle).', pricePerDay: 500 },
];

export const hubs: Hub[] = [
  { id: 'hub-01', name: 'Göteborg', postalCode: '41110', address: 'Exportgatan 15, Göteborg', maxDeliveryRadiusKm: 250, mediumRadiusKm: 30, farRadiusKm: 100, baseDeliveryFee: 800, mediumDeliveryFee: 1500, farDeliveryFee: 2500 },
  { id: 'hub-02', name: 'Stockholm Norr', postalCode: '11520', address: 'Lager 3, Värtahamnen, Stockholm', maxDeliveryRadiusKm: 250, mediumRadiusKm: 30, farRadiusKm: 100, baseDeliveryFee: 800, mediumDeliveryFee: 1500, farDeliveryFee: 2500 },
  { id: 'hub-04', name: 'Stockholm Syd', postalCode: '12533', address: 'Magasinsvägen 8, Älvsjö', maxDeliveryRadiusKm: 250, mediumRadiusKm: 30, farRadiusKm: 100, baseDeliveryFee: 800, mediumDeliveryFee: 1500, farDeliveryFee: 2500 },
  { id: 'hub-03', name: 'Malmö', postalCode: '21120', address: 'Cementgatan 2, Malmö', maxDeliveryRadiusKm: 250, mediumRadiusKm: 30, farRadiusKm: 100, baseDeliveryFee: 800, mediumDeliveryFee: 1500, farDeliveryFee: 2500 },
];

// Assets per hub
// Göteborg: 3 Premium, 2 Standard, 1 Handikapp, 1 Lyx (uthyrd)
// Stockholm: 2 Premium, 3 Standard, 1 Handikapp
// Malmö: 1 Premium, 1 Standard, 2 Handikapp, 2 Lyx
export const mockAssets: Asset[] = [
  // === GÖTEBORG ===
  { id: '02i-001', name: 'TOA-0001', serialNumber: 'TOA-PRE-GBG-001', productId: '01t-001', hubId: 'hub-01', status: 'Tillgänglig' },
  { id: '02i-002', name: 'TOA-0002', serialNumber: 'TOA-PRE-GBG-002', productId: '01t-001', hubId: 'hub-01', status: 'Tillgänglig' },
  { id: '02i-003', name: 'TOA-0003', serialNumber: 'TOA-PRE-GBG-003', productId: '01t-001', hubId: 'hub-01', status: 'Tillgänglig' },
  { id: '02i-004', name: 'TOA-0004', serialNumber: 'TOA-STD-GBG-001', productId: '01t-002', hubId: 'hub-01', status: 'Tillgänglig' },
  { id: '02i-005', name: 'TOA-0005', serialNumber: 'TOA-STD-GBG-002', productId: '01t-002', hubId: 'hub-01', status: 'Tillgänglig' },
  { id: '02i-006', name: 'TOA-0006', serialNumber: 'TOA-HCP-GBG-001', productId: '01t-003', hubId: 'hub-01', status: 'Tillgänglig' },
  { id: '02i-007', name: 'TOA-0007', serialNumber: 'TOA-LYX-GBG-001', productId: '01t-004', hubId: 'hub-01', status: 'Uthyrd' },

  // === STOCKHOLM NORR ===
  { id: '02i-008', name: 'TOA-0008', serialNumber: 'TOA-PRE-STHLM-N-001', productId: '01t-001', hubId: 'hub-02', status: 'Tillgänglig' },
  { id: '02i-009', name: 'TOA-0009', serialNumber: 'TOA-PRE-STHLM-N-002', productId: '01t-001', hubId: 'hub-02', status: 'Tillgänglig' },
  { id: '02i-010', name: 'TOA-0010', serialNumber: 'TOA-STD-STHLM-N-001', productId: '01t-002', hubId: 'hub-02', status: 'Tillgänglig' },
  { id: '02i-011', name: 'TOA-0011', serialNumber: 'TOA-STD-STHLM-N-002', productId: '01t-002', hubId: 'hub-02', status: 'Tillgänglig' },
  { id: '02i-012', name: 'TOA-0012', serialNumber: 'TOA-STD-STHLM-N-003', productId: '01t-002', hubId: 'hub-02', status: 'Tillgänglig' },
  { id: '02i-013', name: 'TOA-0013', serialNumber: 'TOA-HCP-STHLM-N-001', productId: '01t-003', hubId: 'hub-02', status: 'Tillgänglig' },

  // === STOCKHOLM SYD ===
  { id: '02i-020', name: 'TOA-0020', serialNumber: 'TOA-PRE-STHLM-S-001', productId: '01t-001', hubId: 'hub-04', status: 'Tillgänglig' },
  { id: '02i-021', name: 'TOA-0021', serialNumber: 'TOA-PRE-STHLM-S-002', productId: '01t-001', hubId: 'hub-04', status: 'Tillgänglig' },
  { id: '02i-022', name: 'TOA-0022', serialNumber: 'TOA-STD-STHLM-S-001', productId: '01t-002', hubId: 'hub-04', status: 'Tillgänglig' },
  { id: '02i-023', name: 'TOA-0023', serialNumber: 'TOA-STD-STHLM-S-002', productId: '01t-002', hubId: 'hub-04', status: 'Tillgänglig' },
  { id: '02i-024', name: 'TOA-0024', serialNumber: 'TOA-HCP-STHLM-S-001', productId: '01t-003', hubId: 'hub-04', status: 'Tillgänglig' },
  { id: '02i-025', name: 'TOA-0025', serialNumber: 'TOA-LYX-STHLM-S-001', productId: '01t-004', hubId: 'hub-04', status: 'Tillgänglig' },

  // === MALMÖ ===
  { id: '02i-014', name: 'TOA-0014', serialNumber: 'TOA-PRE-MALMO-001', productId: '01t-001', hubId: 'hub-03', status: 'Tillgänglig' },
  { id: '02i-015', name: 'TOA-0015', serialNumber: 'TOA-STD-MALMO-001', productId: '01t-002', hubId: 'hub-03', status: 'Tillgänglig' },
  { id: '02i-016', name: 'TOA-0016', serialNumber: 'TOA-HCP-MALMO-001', productId: '01t-003', hubId: 'hub-03', status: 'Tillgänglig' },
  { id: '02i-017', name: 'TOA-0017', serialNumber: 'TOA-HCP-MALMO-002', productId: '01t-003', hubId: 'hub-03', status: 'Tillgänglig' },
  { id: '02i-018', name: 'TOA-0018', serialNumber: 'TOA-LYX-MALMO-001', productId: '01t-004', hubId: 'hub-03', status: 'Tillgänglig' },
  { id: '02i-019', name: 'TOA-0019', serialNumber: 'TOA-LYX-MALMO-002', productId: '01t-004', hubId: 'hub-03', status: 'Tillgänglig' },
];

// === Hjälpfunktioner ===

export function getProduct(id: string): Product | undefined {
  return [...products, ...addonProducts].find((p) => p.id === id);
}

export function getHub(id: string): Hub | undefined {
  return hubs.find((h) => h.id === id);
}

// Geografisk distansberäkning baserat på svenska postnummer-prefix.
// Approximativa centroider per postnummer-område (2-siffrigt prefix).
// Lat/lng är ungefärliga; tillräckliga för att välja närmaste hub korrekt.
// Riktig prod skulle använda Google Maps Distance Matrix API.

type LatLng = { lat: number; lng: number };

// Postnummer-prefix → ungefärlig centroid
const POSTAL_CENTROIDS: Record<string, LatLng> = {
  // Stockholm-området (10-19)
  '10': { lat: 59.33, lng: 18.07 },  // Stockholm City
  '11': { lat: 59.33, lng: 18.07 },  // Stockholm City
  '12': { lat: 59.30, lng: 18.05 },  // Södra Stockholm
  '13': { lat: 59.20, lng: 18.15 },  // Nack/Värmdö
  '14': { lat: 59.21, lng: 17.92 },  // Huddinge/Botkyrka
  '15': { lat: 59.16, lng: 17.62 },  // Södertälje
  '16': { lat: 59.36, lng: 17.97 },  // Bromma/Solna
  '17': { lat: 59.41, lng: 17.95 },  // Sundbyberg/Järfälla
  '18': { lat: 59.40, lng: 18.30 },  // Lidingö/Vaxholm
  '19': { lat: 59.62, lng: 17.85 },  // Märsta/Sigtuna
  // Mellansverige (20-29)
  '20': { lat: 55.61, lng: 13.00 },  // Malmö City
  '21': { lat: 55.60, lng: 13.00 },  // Malmö City
  '22': { lat: 55.71, lng: 13.19 },  // Lund
  '23': { lat: 55.45, lng: 13.00 },  // Trelleborg
  '24': { lat: 55.94, lng: 13.55 },  // Höör/Eslöv
  '25': { lat: 56.05, lng: 12.69 },  // Helsingborg
  '26': { lat: 56.18, lng: 12.55 },  // Ängelholm
  '27': { lat: 55.70, lng: 13.95 },  // Sjöbo/Hörby
  '28': { lat: 56.15, lng: 14.85 },  // Kristianstad
  '29': { lat: 56.16, lng: 14.86 },  // Kristianstad område
  // Västsverige (30-49)
  '30': { lat: 56.67, lng: 12.86 },  // Halmstad
  '31': { lat: 56.85, lng: 12.55 },  // Falkenberg
  '32': { lat: 57.10, lng: 12.25 },  // Varberg
  '33': { lat: 57.42, lng: 14.05 },  // Värnamo/Gisláved
  '34': { lat: 56.88, lng: 14.81 },  // Växjö/Ljungby
  '35': { lat: 56.88, lng: 14.81 },  // Växjö
  '36': { lat: 56.55, lng: 15.59 },  // Kalmar/Emmaboda
  '37': { lat: 56.16, lng: 15.59 },  // Karlskrona/Karlshamn
  '38': { lat: 56.66, lng: 16.36 },  // Borgholm/Mönsterås
  '39': { lat: 56.66, lng: 16.36 },  // Kalmar område
  // Göteborg/Västsverige (40-49)
  '40': { lat: 57.71, lng: 11.97 },  // Göteborg City
  '41': { lat: 57.71, lng: 11.97 },  // Göteborg
  '42': { lat: 57.65, lng: 12.02 },  // Västra Frölunda
  '43': { lat: 57.65, lng: 11.93 },  // Askim/Mölndal
  '44': { lat: 57.78, lng: 12.27 },  // Lerum/Alingås
  '45': { lat: 58.35, lng: 11.93 },  // Uddevalla
  '46': { lat: 58.36, lng: 12.32 },  // Vänersborg/Trollhättan
  '47': { lat: 57.88, lng: 11.66 },  // Stenungsund/Tjörn
  '48': { lat: 57.74, lng: 12.10 },  // Kungsbacka
  '49': { lat: 58.28, lng: 12.30 },  // Vänersborg område
  // Mellansverige/Bergslagen (50-69)
  '50': { lat: 57.72, lng: 12.94 },  // Borås
  '51': { lat: 57.72, lng: 12.94 },  // Borås
  '52': { lat: 58.38, lng: 13.85 },  // Skövde
  '53': { lat: 58.38, lng: 13.85 },  // Skövde/Mölndal
  '54': { lat: 58.71, lng: 13.81 },  // Mariestad
  '55': { lat: 57.78, lng: 14.16 },  // Jönköping
  '56': { lat: 57.78, lng: 14.16 },  // Jönköping
  '57': { lat: 57.65, lng: 14.69 },  // Eksjö/Tranås
  '58': { lat: 58.41, lng: 15.62 },  // Linköping
  '59': { lat: 58.59, lng: 16.18 },  // Norrköping
  '60': { lat: 58.59, lng: 16.18 },  // Norrköping
  '61': { lat: 58.74, lng: 17.01 },  // Nyköping
  '62': { lat: 57.65, lng: 18.30 },  // Visby/Gotland
  '63': { lat: 59.37, lng: 16.51 },  // Eskilstuna
  '64': { lat: 59.04, lng: 16.21 },  // Katrineholm/Flen
  '65': { lat: 59.38, lng: 13.50 },  // Karlstad
  '66': { lat: 59.38, lng: 13.50 },  // Karlstad
  '67': { lat: 59.74, lng: 14.16 },  // Arvika/Filipstad
  '68': { lat: 59.62, lng: 14.53 },  // Hagfors/Munkfors
  '69': { lat: 59.51, lng: 14.52 },  // Kristinehamn
  // Mellannorrland (70-89)
  '70': { lat: 59.27, lng: 15.21 },  // Örebro
  '71': { lat: 59.27, lng: 15.21 },  // Örebro
  '72': { lat: 59.61, lng: 16.55 },  // Västerås
  '73': { lat: 59.62, lng: 16.55 },  // Västerås
  '74': { lat: 59.86, lng: 17.64 },  // Uppsala
  '75': { lat: 59.86, lng: 17.64 },  // Uppsala
  '76': { lat: 60.31, lng: 18.02 },  // Östhammar/Norrtälje
  '77': { lat: 60.27, lng: 15.02 },  // Ludvika/Smedjebacken
  '78': { lat: 60.61, lng: 15.63 },  // Borlänge/Falun
  '79': { lat: 61.18, lng: 13.55 },  // Mora/Örnsköldsvik
  '80': { lat: 60.67, lng: 17.14 },  // Gävle
  '81': { lat: 60.67, lng: 17.14 },  // Gävle
  '82': { lat: 61.31, lng: 16.41 },  // Bollnäs/Söderhamn
  '83': { lat: 63.18, lng: 14.64 },  // Östersund
  '84': { lat: 63.18, lng: 14.64 },  // Östersund område
  '85': { lat: 62.39, lng: 17.31 },  // Sundsvall
  '86': { lat: 62.39, lng: 17.31 },  // Sundsvall
  '87': { lat: 62.63, lng: 17.94 },  // Härnösand
  '88': { lat: 63.30, lng: 18.71 },  // Sollefteå/Kramfors
  '89': { lat: 63.29, lng: 18.71 },  // Örnsköldsvik
  // Norrland (90-99)
  '90': { lat: 63.83, lng: 20.26 },  // Umeå
  '91': { lat: 63.83, lng: 20.26 },  // Umeå
  '92': { lat: 64.75, lng: 20.95 },  // Skellefteå
  '93': { lat: 64.75, lng: 20.95 },  // Skellefteå/Piteå
  '94': { lat: 65.32, lng: 21.48 },  // Piteå
  '95': { lat: 65.58, lng: 22.15 },  // Luleå
  '96': { lat: 65.83, lng: 21.69 },  // Luleå/Boden
  '97': { lat: 65.58, lng: 22.15 },  // Luleå område
  '98': { lat: 67.85, lng: 20.22 },  // Kiruna
  '99': { lat: 68.43, lng: 22.50 },  // Gällivare/Kiruna
};

// Haversine formula — great-circle distance i km
function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371; // jordens radie i km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

function lookupCentroid(postalCode: string): LatLng | null {
  const clean = postalCode.replace(/\s/g, '');
  const prefix = clean.substring(0, 2);
  return POSTAL_CENTROIDS[prefix] || null;
}

// Geografiskt avstånd mellan två svenska postnummer (km).
// Returnerar 9999 (utanför räckvidd) om okänt postnummer.
function getMockDistance(postalCode: string, hubPostalCode: string): number {
  const customer = lookupCentroid(postalCode);
  const hub = lookupCentroid(hubPostalCode);
  if (!customer || !hub) return 9999;
  // Multiplicera med ~1.3 för att approximera vägavstånd (inte fågelväg)
  return Math.round(haversineKm(customer, hub) * 1.3);
}

// Hitta hubar inom räckvidd, sorterade efter avstånd
export function findHubsForPostalCode(postalCode: string): Hub[] {
  const results = hubs
    .map((hub) => {
      const distanceKm = getMockDistance(postalCode, hub.postalCode);
      if (distanceKm > hub.maxDeliveryRadiusKm) return null;

      let deliveryFee = hub.farDeliveryFee;
      if (distanceKm <= hub.mediumRadiusKm) deliveryFee = hub.baseDeliveryFee;
      else if (distanceKm <= hub.farRadiusKm) deliveryFee = hub.mediumDeliveryFee;

      return { ...hub, distanceKm, deliveryFee };
    })
    .filter((h): h is Hub & { distanceKm: number; deliveryFee: number } => h !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return results;
}

// Kolla tillgänglighet per hub för alla valda produkter
export function checkHubAvailability(
  hubId: string,
  selectedProducts: SelectedProduct[]
): { available: boolean; counts: Array<{ productId: string; available: number; needed: number }> } {
  const counts = selectedProducts.map((sp) => {
    const available = mockAssets.filter(
      (a) => a.hubId === hubId && a.productId === sp.productId && a.status === 'Tillgänglig'
    ).length;
    return { productId: sp.productId, available, needed: sp.quantity };
  });

  return {
    available: counts.every((c) => c.available >= c.needed),
    counts,
  };
}

// Hitta bästa hub för en bokning
export function findBestHub(
  postalCode: string,
  selectedProducts: SelectedProduct[]
): { hub: Hub; distanceKm: number; deliveryFee: number } | null {
  const reachableHubs = findHubsForPostalCode(postalCode);

  for (const hub of reachableHubs) {
    const avail = checkHubAvailability(hub.id, selectedProducts);
    if (avail.available) {
      return { hub, distanceKm: hub.distanceKm!, deliveryFee: hub.deliveryFee! };
    }
  }

  return null; // Ingen hub har alla toaletter
}

export const EXPRESS_FEE = 500;
export const EXPRESS_CUTOFF_DAYS = 3;

// Kolla om en beställning är express (≤ 3 dagar fram)
export function isExpressOrder(startDate: string): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= EXPRESS_CUTOFF_DAYS && diffDays >= 0;
}

// Prisberäkning med hub-frakt + expressavgift
export function calculatePrice(
  selectedProducts: SelectedProduct[],
  startDate: string,
  endDate: string,
  addons: { productId: string; quantity: number; pricePerDay: number }[],
  deliveryFee: number
): { toiletRental: number; addons: number; delivery: number; expressFee: number; total: number; numberOfDays: number } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  const toiletRental = selectedProducts.reduce((sum, sp) => {
    const product = getProduct(sp.productId);
    return sum + (product ? days * product.pricePerDay * sp.quantity : 0);
  }, 0);

  const addonsTotal = addons.reduce((sum, a) => sum + days * a.pricePerDay * a.quantity, 0);

  const expressFee = isExpressOrder(startDate) ? EXPRESS_FEE : 0;
  const total = toiletRental + addonsTotal + deliveryFee + expressFee;

  return { toiletRental, addons: addonsTotal, delivery: deliveryFee, expressFee, total, numberOfDays: days };
}

export function getAvailableCount(productId: string, hubId?: string): number {
  return mockAssets.filter(
    (a) => a.productId === productId && a.status === 'Tillgänglig' && (!hubId || a.hubId === hubId)
  ).length;
}

export function getHubForAsset(assetId: string): Hub | undefined {
  const asset = mockAssets.find((a) => a.id === assetId);
  return asset ? getHub(asset.hubId) : undefined;
}

export const productNames: Record<string, string> = {
  '01t-001': 'Premiumtoalett',
  '01t-002': 'Standardtoalett',
  '01t-003': 'Handikapptoalett',
  '01t-004': 'Lyxtoalett',
};
