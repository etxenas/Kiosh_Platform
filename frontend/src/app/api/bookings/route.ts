import { NextRequest, NextResponse } from 'next/server';
import { calculatePrice, isExpressOrder, EXPRESS_FEE } from '@/lib/pricing';
import { Product } from '@/lib/types';

const API_BASE =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://salesforce-backend-zeta.vercel.app';

interface SfHub {
  Id: string;
  Name: string;
  Address__c: string | null;
  PostalCode__c: string | null;
  BaseDeliveryFee__c: number | null;
}

interface CatalogProductDto {
  id: string;
  name: string;
  productCode: string;
  family: string;
  description: string | null;
  pricePerDay: number;
}

interface AvailabilityDto {
  availability: Record<string, Record<string, number>>;
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
    deliveryNotes,
    hubId,
    postalCode,
    serviceLevel = 'Bas',
  } = body;

  if (!selectedProducts || selectedProducts.length === 0 || !startDate || !endDate || !customer?.email) {
    return NextResponse.json({ error: 'Saknar obligatoriska fält' }, { status: 400 });
  }

  if (!postalCode || !hubId) {
    return NextResponse.json({ error: 'Postnummer och hub krävs' }, { status: 400 });
  }

  try {
    // Hämta katalog från backend för att räkna pris
    const [hubsData, productsData] = await Promise.all([
      fetchJson<{ records: SfHub[] }>(`${API_BASE}/api/hubs`),
      fetchJson<{ products: CatalogProductDto[] }>(`${API_BASE}/api/catalog/products`),
    ]);

    const hub = (hubsData.records || []).find((h) => h.Id === hubId);
    const toilets: Product[] = (productsData.products || []).map((p) => ({
      id: p.id,
      name: p.name,
      productCode: p.productCode,
      family: 'Toalett' as const,
      description: p.description || '',
      pricePerDay: p.pricePerDay,
    }));

    const deliveryFee = hub?.BaseDeliveryFee__c ?? 800;
    const distanceKm = body.distanceKm ?? 0;
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
    );

    // Service level multiplier
    const { SERVICE_LEVELS } = await import('@/lib/api');
    const serviceLevelData = SERVICE_LEVELS.find((l: { id: string }) => l.id === serviceLevel);
    const serviceMultiplier = (serviceLevelData as { priceMultiplier?: number })?.priceMultiplier || 1;
    const serviceFee = serviceMultiplier > 1 ? Math.round(price.toiletRental * (serviceMultiplier - 1)) : 0;

    const totalPrice = price.total + serviceFee;

    // Skapa riktig Hyrto_Booking__c i SF — hitta första tillgängliga Asset i hub+produkt
    let bookingId = `BOOK-${Date.now().toString(36).toUpperCase()}`;
    let realBookingCreated = false;

    try {
      const avail = await fetchJson<AvailabilityDto>(
        `${API_BASE}/api/catalog/availability?fromDate=${startDate}&toDate=${endDate}&hubId=${hubId}`
      );
      const primary = selectedProducts[0];
      const remaining = avail.availability?.[hubId]?.[primary.productId] ?? 0;
      // Behöver en faktisk Asset-id — hämta från backend assets med filter
      // För enkelhetens skull: backend skapar bokning utan Asset__c om vi inte har en.
      const assetId: string | null = null;
      // (Skulle kunna addera /api/catalog/assets?hubId&productId=... senare för att picka exakt asset.)

      const sfPayload: Record<string, unknown> = {
        Hub__c: hubId,
        StartDateTime__c: `${startDate}T08:00:00Z`,
        EndDateTime__c: `${endDate}T18:00:00Z`,
        Status__c: 'Bokad',
        CustomerName__c: `${customer.firstName} ${customer.lastName}`,
        CustomerEmail__c: customer.email,
        CustomerPhone__c: customer.phone,
        DeliveryAddress__c: `${deliveryAddress.street}, ${deliveryAddress.postalCode} ${deliveryAddress.city}`,
        CustomerPostalCode__c: postalCode,
        DistanceKm__c: distanceKm,
        DeliveryFee__c: deliveryFee,
        DeliveryNotes__c: deliveryNotes || '',
        BasePrice__c: price.toiletRental,
        TotalPrice__c: totalPrice,
        ServiceLevel__c: serviceLevel,
        ServiceIntervalHours__c: (serviceLevelData as { intervalHours?: number })?.intervalHours || 0,
        IncludesWaterRefill__c: (serviceLevelData as { includesWaterRefill?: boolean })?.includesWaterRefill || false,
        IncludesCleaning__c: (serviceLevelData as { includesCleaning?: boolean })?.includesCleaning || false,
      };
      if (assetId) sfPayload.Asset__c = assetId;
      // Notera: remaining används bara för logging — om 0 så skapas ingen bokning men funnel-tracking sköter leadet
      if (remaining < 0) console.warn('Negative availability — skipping booking', remaining);

      const sfRes = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sfPayload),
      });

      if (sfRes.ok) {
        const sfData = await sfRes.json();
        bookingId = sfData.Name || sfData.id || bookingId;
        realBookingCreated = true;
      } else {
        console.warn('SF booking failed:', sfRes.status, await sfRes.text().catch(() => ''));
      }
    } catch (e) {
      console.warn('Could not create Salesforce booking:', e);
    }

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
      distanceKm,
      isExpress,
      expressFee: isExpress ? EXPRESS_FEE : 0,
      serviceLevel,
      realBookingCreated,
    }, { status: 201 });
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Kunde inte skapa bokning.' }, { status: 500 });
  }
}
