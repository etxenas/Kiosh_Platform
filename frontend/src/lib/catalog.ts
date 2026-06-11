/**
 * Catalog API — hämtar riktig data från Salesforce via backend.
 * Ersätter den gamla mock-data.ts.
 *
 * Endpoints:
 *   GET /api/hubs                                     → aktiva hubs med leveransfee/radius
 *   GET /api/catalog/products                         → toaletter med pris (Family=Toalett)
 *   GET /api/catalog/addons                           → tillval med pris (Family=Tillval)
 *   GET /api/catalog/availability?fromDate&toDate     → {[hubId]: {[productId]: count}}
 */

import { Hub, Product } from './types';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://salesforce-backend-zeta.vercel.app';

// ── Hubs ──────────────────────────────────────────────────────────────────────

interface SfHub {
  Id: string;
  Name: string;
  Address__c: string | null;
  PostalCode__c: string | null;
  IsActive__c: boolean;
  BaseDeliveryFee__c: number | null;
  MediumDeliveryFee__c: number | null;
  FarDeliveryFee__c: number | null;
  MediumRadiusKm__c: number | null;
  FarRadiusKm__c: number | null;
  MaxDeliveryRadiusKm__c: number | null;
}

function mapSfHub(r: SfHub): Hub {
  return {
    id: r.Id,
    name: r.Name,
    address: r.Address__c || '',
    postalCode: r.PostalCode__c || '',
    baseDeliveryFee: r.BaseDeliveryFee__c ?? 0,
    mediumDeliveryFee: r.MediumDeliveryFee__c ?? 0,
    farDeliveryFee: r.FarDeliveryFee__c ?? 0,
    mediumRadiusKm: r.MediumRadiusKm__c ?? 0,
    farRadiusKm: r.FarRadiusKm__c ?? 0,
    maxDeliveryRadiusKm: r.MaxDeliveryRadiusKm__c ?? 0,
  };
}

let hubsCache: Hub[] | null = null;
let hubsInflight: Promise<Hub[]> | null = null;

export async function fetchHubs(): Promise<Hub[]> {
  if (hubsCache) return hubsCache;
  if (hubsInflight) return hubsInflight;
  hubsInflight = (async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/hubs`);
      if (!res.ok) throw new Error(`hubs ${res.status}`);
      const data = await res.json();
      const hubs: Hub[] = (data.records || []).map(mapSfHub);
      hubsCache = hubs;
      return hubs;
    } finally {
      hubsInflight = null;
    }
  })();
  return hubsInflight;
}

// ── Produkter (toaletter) ─────────────────────────────────────────────────────

interface CatalogProduct {
  id: string;
  pricebookEntryId: string;
  name: string;
  productCode: string;
  family: string;
  description: string | null;
  pricePerDay: number;
  longRentalDailyRate?: number | null;
  fullPriceDays?: number | null;
}

function mapCatalogProduct(p: CatalogProduct): Product {
  return {
    id: p.id,
    name: p.name,
    productCode: p.productCode,
    family: (p.family || 'Toalett') as Product['family'],
    description: p.description || '',
    pricePerDay: p.pricePerDay,
    longRentalDailyRate: p.longRentalDailyRate ?? null,
    fullPriceDays: p.fullPriceDays ?? null,
  };
}

let productsCache: Product[] | null = null;
let productsInflight: Promise<Product[]> | null = null;

export async function fetchProducts(): Promise<Product[]> {
  if (productsCache) return productsCache;
  if (productsInflight) return productsInflight;
  productsInflight = (async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/catalog/products`);
      if (!res.ok) throw new Error(`products ${res.status}`);
      const data = await res.json();
      const products: Product[] = (data.products || []).map(mapCatalogProduct);
      productsCache = products;
      return products;
    } finally {
      productsInflight = null;
    }
  })();
  return productsInflight;
}

// ── Addons (tillval) ──────────────────────────────────────────────────────────

let addonsCache: Product[] | null = null;
let addonsInflight: Promise<Product[]> | null = null;

export async function fetchAddons(): Promise<Product[]> {
  if (addonsCache) return addonsCache;
  if (addonsInflight) return addonsInflight;
  addonsInflight = (async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/catalog/addons`);
      if (!res.ok) throw new Error(`addons ${res.status}`);
      const data = await res.json();
      const addons: Product[] = (data.addons || []).map(mapCatalogProduct);
      addonsCache = addons;
      return addons;
    } finally {
      addonsInflight = null;
    }
  })();
  return addonsInflight;
}

// ── Availability ──────────────────────────────────────────────────────────────

export type Availability = Record<string, Record<string, number>>;

export interface AvailabilityResult {
  availability: Availability;
  fromDate: string;
  toDate: string;
  totalAssets: number;
  overlappingBookings: number;
}

const availCache = new Map<string, AvailabilityResult>();
const availInflight = new Map<string, Promise<AvailabilityResult>>();

export async function fetchAvailability(
  fromDate: string,
  toDate: string,
  hubId?: string
): Promise<AvailabilityResult> {
  const key = `${fromDate}|${toDate}|${hubId || ''}`;
  if (availCache.has(key)) return availCache.get(key)!;
  if (availInflight.has(key)) return availInflight.get(key)!;
  const promise = (async () => {
    try {
      const params = new URLSearchParams({ fromDate, toDate });
      if (hubId) params.set('hubId', hubId);
      const res = await fetch(`${BACKEND_URL}/api/catalog/availability?${params}`);
      if (!res.ok) throw new Error(`availability ${res.status}`);
      const data: AvailabilityResult = await res.json();
      availCache.set(key, data);
      return data;
    } finally {
      availInflight.delete(key);
    }
  })();
  availInflight.set(key, promise);
  return promise;
}

// Returnera availableCount för en (hub, product) baserat på senast hämtad availability.
// Om inget angetts (ingen availability hämtad) — returnera null = "okänt".
export function getAvailableCountFor(
  result: AvailabilityResult | null,
  hubId: string,
  productId: string
): number | null {
  if (!result) return null;
  const hub = result.availability[hubId];
  if (!hub) return 0;
  return hub[productId] ?? 0;
}

// ── Hub-distans (lokal beräkning från postnummer-prefix) ──────────────────────

// Approximativa centroider per svenskt postnummer-prefix (2 siffror).
// Tillräckliga för "hitta närmaste hub". Riktig prod skulle använda Google Maps
// Distance Matrix API.
type LatLng = { lat: number; lng: number };

const PC_CENTROIDS: Record<string, LatLng> = {
  '10': { lat: 59.33, lng: 18.07 }, '11': { lat: 59.34, lng: 18.07 }, '12': { lat: 59.30, lng: 18.05 },
  '13': { lat: 59.28, lng: 18.30 }, '14': { lat: 59.23, lng: 17.98 }, '15': { lat: 58.92, lng: 17.95 },
  '16': { lat: 59.36, lng: 17.93 }, '17': { lat: 59.40, lng: 17.95 }, '18': { lat: 59.43, lng: 18.05 },
  '19': { lat: 59.62, lng: 17.84 }, '20': { lat: 55.61, lng: 13.00 }, '21': { lat: 55.60, lng: 13.00 },
  '22': { lat: 55.71, lng: 13.19 }, '23': { lat: 55.43, lng: 13.83 }, '24': { lat: 55.71, lng: 13.21 },
  '25': { lat: 56.05, lng: 12.71 }, '26': { lat: 56.04, lng: 12.69 }, '27': { lat: 55.41, lng: 13.15 },
  '28': { lat: 56.16, lng: 14.86 }, '29': { lat: 56.04, lng: 14.16 }, '30': { lat: 56.67, lng: 12.85 },
  '31': { lat: 56.83, lng: 12.95 }, '32': { lat: 57.10, lng: 14.20 }, '33': { lat: 57.18, lng: 14.04 },
  '34': { lat: 56.88, lng: 14.81 }, '35': { lat: 56.88, lng: 14.81 }, '36': { lat: 56.55, lng: 15.59 },
  '37': { lat: 56.27, lng: 15.27 }, '38': { lat: 56.66, lng: 16.36 }, '39': { lat: 56.66, lng: 16.36 },
  '40': { lat: 57.71, lng: 11.97 }, '41': { lat: 57.71, lng: 11.97 }, '42': { lat: 57.65, lng: 11.93 },
  '43': { lat: 57.65, lng: 11.93 }, '44': { lat: 58.28, lng: 12.29 }, '45': { lat: 58.35, lng: 11.91 },
  '46': { lat: 58.38, lng: 12.34 }, '47': { lat: 58.04, lng: 11.51 }, '48': { lat: 57.42, lng: 12.30 },
  '49': { lat: 58.04, lng: 11.51 }, '50': { lat: 57.78, lng: 13.42 }, '51': { lat: 57.78, lng: 13.42 },
  '52': { lat: 58.39, lng: 13.85 }, '53': { lat: 58.38, lng: 13.85 }, '54': { lat: 58.39, lng: 13.85 },
  '55': { lat: 58.41, lng: 15.62 }, '56': { lat: 58.41, lng: 15.62 }, '57': { lat: 57.78, lng: 14.16 },
  '58': { lat: 58.41, lng: 15.62 }, '59': { lat: 58.59, lng: 16.18 }, '60': { lat: 58.59, lng: 16.18 },
  '61': { lat: 58.75, lng: 17.01 }, '62': { lat: 57.63, lng: 18.30 }, '63': { lat: 59.37, lng: 16.51 },
  '64': { lat: 59.23, lng: 17.61 }, '65': { lat: 59.38, lng: 13.50 }, '66': { lat: 59.45, lng: 13.07 },
  '67': { lat: 59.66, lng: 12.59 }, '68': { lat: 59.61, lng: 13.30 }, '69': { lat: 59.50, lng: 14.52 },
  '70': { lat: 59.27, lng: 15.21 }, '71': { lat: 59.34, lng: 15.10 }, '72': { lat: 59.61, lng: 16.55 },
  '73': { lat: 59.62, lng: 16.55 }, '74': { lat: 59.84, lng: 17.65 }, '75': { lat: 59.86, lng: 17.64 },
  '76': { lat: 59.76, lng: 18.71 }, '77': { lat: 60.15, lng: 15.18 }, '78': { lat: 60.49, lng: 15.43 },
  '79': { lat: 61.36, lng: 16.46 }, '80': { lat: 60.67, lng: 17.14 }, '81': { lat: 60.67, lng: 17.14 },
  '82': { lat: 61.30, lng: 17.06 }, '83': { lat: 63.18, lng: 14.64 }, '84': { lat: 62.39, lng: 17.31 },
  '85': { lat: 62.39, lng: 17.31 }, '86': { lat: 62.42, lng: 17.43 }, '87': { lat: 62.63, lng: 17.94 },
  '88': { lat: 63.18, lng: 14.64 }, '89': { lat: 63.83, lng: 20.26 }, '90': { lat: 63.83, lng: 20.26 },
  '91': { lat: 63.83, lng: 20.26 }, '92': { lat: 65.59, lng: 22.15 }, '93': { lat: 65.31, lng: 21.48 },
  '94': { lat: 65.83, lng: 21.69 }, '95': { lat: 65.83, lng: 21.69 }, '96': { lat: 67.85, lng: 20.22 },
  '97': { lat: 65.59, lng: 22.15 }, '98': { lat: 67.85, lng: 20.22 },
};

function getLatLng(pc: string): LatLng | null {
  const prefix = pc.replace(/\s/g, '').slice(0, 2);
  return PC_CENTROIDS[prefix] || null;
}

function haversine(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function distanceKmFromPostalCode(customerPc: string, hub: Hub): number | null {
  const a = getLatLng(customerPc);
  const b = getLatLng(hub.postalCode);
  if (!a || !b) return null;
  return Math.round(haversine(a, b));
}

export function deliveryFeeFor(hub: Hub, distanceKm: number): number {
  if (distanceKm <= hub.mediumRadiusKm) return hub.baseDeliveryFee;
  if (distanceKm <= hub.farRadiusKm) return hub.mediumDeliveryFee;
  return hub.farDeliveryFee;
}

export interface ReachableHub extends Hub {
  distanceKm: number;
  deliveryFee: number;
}

// Returnera hubs som ligger inom maxDeliveryRadiusKm från kundens postnummer,
// berikade med distanceKm och deliveryFee. Sorterade efter avstånd.
export function reachableHubsFor(customerPc: string, hubs: Hub[]): ReachableHub[] {
  const out: ReachableHub[] = [];
  for (const h of hubs) {
    const d = distanceKmFromPostalCode(customerPc, h);
    if (d === null) continue;
    if (d > (h.maxDeliveryRadiusKm || 0)) continue;
    out.push({ ...h, distanceKm: d, deliveryFee: deliveryFeeFor(h, d) });
  }
  out.sort((a, b) => a.distanceKm - b.distanceKm);
  return out;
}

// Hittar den billigaste hubben i `reachableHubs` som har ALLA önskade produkter
// (productId → quantity) tillgängliga i `availability`. Returnerar null om ingen enskild
// hub kan tillgodose hela bokningen (kund måste kontakta oss).
//
// Sortering: lägst deliveryFee först; vid lika fee, kortast distance.
export function findCheapestHubWithAll(
  reachableHubs: ReachableHub[],
  availability: AvailabilityResult | null,
  wanted: Array<{ productId: string; quantity: number }>
): ReachableHub | null {
  if (!availability || wanted.length === 0) return null;
  const candidates = reachableHubs.filter((h) => {
    const hubAvail = availability.availability[h.id] || {};
    return wanted.every((w) => (hubAvail[w.productId] ?? 0) >= w.quantity);
  });
  candidates.sort((a, b) => {
    if (a.deliveryFee !== b.deliveryFee) return a.deliveryFee - b.deliveryFee;
    return a.distanceKm - b.distanceKm;
  });
  return candidates[0] || null;
}
