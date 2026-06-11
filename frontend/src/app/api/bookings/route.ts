import { NextRequest, NextResponse } from 'next/server';
import { calculatePrice, isExpressOrder, EXPRESS_FEE } from '@/lib/pricing';
import { Product } from '@/lib/types';

/**
 * POST /api/bookings
 *
 * Räknar fram pris + returnerar metadata för confirmation-sidan.
 * Själva Salesforce-skapelsen (Lead → Account/Contact/Opportunity/Order/Booking/Asset-reservation)
 * sker via funnel-tracking-flödet i backend när step='bookingCreated' anropas separat
 * av frontenden parallellt med detta.
 *
 * Denna route räknar bara fram totalpriset baserat på riktig katalog från backend.
 */

const API_BASE =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://salesforce-backend-zeta.vercel.app';

interface SfHub {
  Id: string;
  Name: string;
  BaseDeliveryFee__c: number | null;
  MediumDeliveryFee__c: number | null;
  FarDeliveryFee__c: number | null;
}

interface CatalogProductDto {
  id: string;
  name: string;
  productCode: string;
  family: string;
  description: string | null;
  pricePerDay: number;
  longRentalDailyRate?: number | null;
  fullPriceDays?: number | null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    products: selectedProducts,
    startDate,
    endDate,
    addons,
    customer,
    deliveryAddress,
    hubId,
    postalCode,
    serviceLevel = 'Bas',
    distanceKm,
    deliveryFee: clientDeliveryFee,
  } = body;

  if (!selectedProducts || selectedProducts.length === 0 || !startDate || !endDate || !customer?.email) {
    return NextResponse.json({ error: 'Saknar obligatoriska fält' }, { status: 400 });
  }
  if (!postalCode || !hubId) {
    return NextResponse.json({ error: 'Postnummer och hub krävs' }, { status: 400 });
  }

  try {
    const [hubsData, productsData, addonsData] = await Promise.all([
      fetchJson<{ records: SfHub[] }>(`${API_BASE}/api/hubs`),
      fetchJson<{ products: CatalogProductDto[] }>(`${API_BASE}/api/catalog/products`),
      fetchJson<{ addons: CatalogProductDto[] }>(`${API_BASE}/api/catalog/addons`),
    ]);

    const hub = (hubsData.records || []).find((h) => h.Id === hubId);
    const toilets: Product[] = (productsData.products || []).map((p) => ({
      id: p.id,
      name: p.name,
      productCode: p.productCode,
      family: 'Toalett' as const,
      description: p.description || '',
      pricePerDay: p.pricePerDay,
      longRentalDailyRate: p.longRentalDailyRate ?? null,
      fullPriceDays: p.fullPriceDays ?? null,
    }));
    const addonCatalog: Product[] = (addonsData.addons || []).map((p) => ({
      id: p.id,
      name: p.name,
      productCode: p.productCode,
      family: 'Tillval' as const,
      description: p.description || '',
      pricePerDay: p.pricePerDay,
      longRentalDailyRate: p.longRentalDailyRate ?? null,
      fullPriceDays: p.fullPriceDays ?? null,
    }));

    // deliveryFee från frontend (klienten har redan räknat distance) — fallback till hub-base
    const deliveryFee = typeof clientDeliveryFee === 'number'
      ? clientDeliveryFee
      : (hub?.BaseDeliveryFee__c ?? 800);

    const isExpress = isExpressOrder(startDate);

    const price = calculatePrice(
      selectedProducts,
      startDate,
      endDate,
      addons?.map((a: { productId: string; quantity: number; pricePerDay: number }) => ({
        productId: a.productId,
        quantity: a.quantity,
        pricePerDay: a.pricePerDay,
      })) || [],
      deliveryFee,
      toilets,
      addonCatalog,
    );

    // Service-multiplier
    const { SERVICE_LEVELS } = await import('@/lib/api');
    const lvl = SERVICE_LEVELS.find((l: { id: string }) => l.id === serviceLevel) as
      | { priceMultiplier?: number }
      | undefined;
    const serviceMultiplier = lvl?.priceMultiplier || 1;
    const serviceFee = serviceMultiplier > 1
      ? Math.round(price.toiletRental * (serviceMultiplier - 1))
      : 0;

    const totalPrice = price.total + serviceFee;
    const bookingId = `BOOK-${Date.now().toString(36).toUpperCase()}`;

    // Markera deliveryAddress som använd så lintern inte gnäller (vi loggar inte här)
    void deliveryAddress;

    return NextResponse.json({
      bookingId,
      status: 'Bokad',
      totalPrice,
      breakdown: {
        toiletRental: price.toiletRental,
        addons: price.addons,
        delivery: price.delivery,
        expressFee: price.expressFee,
        serviceFee,
        total: totalPrice,
      },
      hubName: hub?.Name || 'Okänd hub',
      distanceKm: distanceKm ?? 0,
      isExpress,
      expressFee: isExpress ? EXPRESS_FEE : 0,
      serviceLevel,
    }, { status: 201 });
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Kunde inte räkna ut bokning.' }, { status: 500 });
  }
}
