// API-klient mot Hyrto backend (port 3200)
// Ersätter mock-data med riktiga Salesforce-anrop

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3200';

export interface ApiHub {
  Id: string;
  Name: string;
  Address__c: string;
  PostalCode__c: string;
  IsActive__c: boolean;
  BaseDeliveryFee__c: number;
  MediumDeliveryFee__c: number;
  FarDeliveryFee__c: number;
  MediumRadiusKm__c: number;
  FarRadiusKm__c: number;
  MaxDeliveryRadiusKm__c: number;
}

export interface ApiAsset {
  Id: string;
  Name: string;
  SerialNumber: string;
  Product2Id: string;
  Product2?: { Name: string; ProductCode: string; Family: string };
  Status: string;
  Hub__c?: string;
}

export interface ApiBooking {
  Id: string;
  Name: string;
  Hub__c: string;
  Hub__r?: { Name: string };
  Asset__c: string;
  Asset__r?: { Name: string };
  StartDateTime__c: string;
  EndDateTime__c: string;
  Status__c: string;
  CustomerName__c: string;
  CustomerEmail__c: string;
  CustomerPhone__c: string;
  DeliveryAddress__c: string;
  CustomerPostalCode__c: string;
  DistanceKm__c: number;
  DeliveryFee__c: number;
  DeliveryNotes__c: string;
  BasePrice__c: number;
  TotalPrice__c: number;
  ServiceLevel__c: string;
  ServiceIntervalHours__c: number;
  IncludesWaterRefill__c: boolean;
  IncludesCleaning__c: boolean;
}

// Hämta alla aktiva hubbar
export async function fetchHubs(): Promise<ApiHub[]> {
  const res = await fetch(`${API_BASE}/api/hubs`);
  if (!res.ok) throw new Error('Kunde inte hämta hubbar');
  const data = await res.json();
  return data.records || data;
}

// Hämta tillgängliga assets
export async function fetchAssets(): Promise<ApiAsset[]> {
  const res = await fetch(`${API_BASE}/api/assets`);
  if (!res.ok) throw new Error('Kunde inte hämta assets');
  const data = await res.json();
  return data.records || data;
}

// Kontrollera tillgänglighet
export async function checkAvailability(params: {
  fromDate: string;
  toDate: string;
  hubId?: string;
  assetId?: string;
}): Promise<any> {
  const q = new URLSearchParams({
    fromDate: params.fromDate,
    toDate: params.toDate,
    ...(params.hubId && { hubId: params.hubId }),
    ...(params.assetId && { assetId: params.assetId }),
  });
  const res = await fetch(`${API_BASE}/api/availability?${q}`);
  if (!res.ok) throw new Error('Kunde inte kontrollera tillgänglighet');
  return res.json();
}

// Skapa bokning
export async function createBooking(params: {
  hubId: string;
  assetId: string;
  startDateTime: string;
  endDateTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  customerPostalCode: string;
  distanceKm: number;
  deliveryFee: number;
  deliveryNotes?: string;
  basePrice: number;
  totalPrice: number;
  serviceLevel?: string;
  serviceIntervalHours?: number;
  includesWaterRefill?: boolean;
  includesCleaning?: boolean;
}): Promise<{ id: string; success: boolean }> {
  const res = await fetch(`${API_BASE}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Kunde inte skapa bokning');
  }
  return res.json();
}

// Hämta bokningar (för framtida "Mina sidor")
export async function fetchBookings(params?: {
  hubId?: string;
  status?: string;
}): Promise<ApiBooking[]> {
  const q = new URLSearchParams();
  if (params?.hubId) q.set('hubId', params.hubId);
  if (params?.status) q.set('status', params.status);
  const res = await fetch(`${API_BASE}/api/bookings?${q}`);
  if (!res.ok) throw new Error('Kunde inte hämta bokningar');
  const data = await res.json();
  return data.records || data;
}

// Beräkna leveransavgift baserat på avstånd och hub
export function calculateDeliveryFee(hub: ApiHub, distanceKm: number): number {
  if (distanceKm <= hub.MediumRadiusKm__c) return hub.BaseDeliveryFee__c;
  if (distanceKm <= hub.FarRadiusKm__c) return hub.MediumDeliveryFee__c;
  if (distanceKm <= hub.MaxDeliveryRadiusKm__c) return hub.FarDeliveryFee__c;
  return -1; // Utanför räckvidd
}

// Enkel avståndsberäkning baserat på postnummer (mock, ersätts med Google Maps)
export function estimateDistance(customerPostal: string, hubPostal: string): number {
  const c = customerPostal.replace(/\s/g, '').substring(0, 2);
  const h = hubPostal.replace(/\s/g, '').substring(0, 2);
  if (c === h) return 5 + Math.floor(Math.random() * 11);
  if (Math.abs(parseInt(c) - parseInt(h)) <= 1) return 25 + Math.floor(Math.random() * 21);
  return 55 + Math.floor(Math.random() * 21);
}

// Service nivåer
export const SERVICE_LEVELS = [
  {
    id: 'Bas',
    name: 'Bas',
    description: 'Ingen service under hyresperioden. Passar korta hyror (1 dag).',
    priceMultiplier: 1.0,
    intervalHours: 0,
    includesCleaning: false,
    includesWaterRefill: false,
    emoji: '📦',
    color: 'from-gray-400 to-gray-500',
  },
  {
    id: 'Standard',
    name: 'Standard',
    description: 'Tömning + avtorkning var 48:e timme. Bekvämt för helg- och evenemangshyror.',
    priceMultiplier: 1.2,
    intervalHours: 48,
    includesCleaning: false,
    includesWaterRefill: false,
    emoji: '🧹',
    color: 'from-blue-400 to-blue-600',
  },
  {
    id: 'Premium',
    name: 'Premium',
    description: 'Full städning var 24:e timme + vattenpåfyllning. För längre hyror och höga krav.',
    priceMultiplier: 1.4,
    intervalHours: 24,
    includesCleaning: true,
    includesWaterRefill: true,
    emoji: '⭐',
    color: 'from-amber-400 to-orange-500',
  },
] as const;

export type ServiceLevel = typeof SERVICE_LEVELS[number];