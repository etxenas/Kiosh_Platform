import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3200';

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
    // Calculate price locally for now (mock data still drives pricing)
    const { calculatePrice, getProduct, isExpressOrder, EXPRESS_FEE, findBestHub } = await import('@/lib/mock-data');

    const hub = (await import('@/lib/mock-data')).hubs.find(h => h.id === hubId);
    const bestHubResult = findBestHub(postalCode, selectedProducts);
    const deliveryFee = bestHubResult?.deliveryFee || hub?.baseDeliveryFee || 800;
    const distanceKm = bestHubResult?.distanceKm || hub?.distanceKm || 0;
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
      deliveryFee
    );

    // Apply service level multiplier
    const serviceLevelData = (await import('@/lib/api')).SERVICE_LEVELS.find((l: any) => l.id === serviceLevel);
    const serviceMultiplier = serviceLevelData?.priceMultiplier || 1;
    const serviceFee = serviceMultiplier > 1 ? Math.round(price.toiletRental * (serviceMultiplier - 1)) : 0;

    const totalPrice = price.total + serviceFee;

    // Try to create real booking in Salesforce backend
    let bookingId = `BOOK-${Date.now().toString(36).toUpperCase()}`;
    let realBookingCreated = false;

    try {
      // Find first available asset for the primary product at this hub
      const { mockAssets } = await import('@/lib/mock-data');
      const primaryProduct = selectedProducts[0];
      const asset = mockAssets.find(
        (a: any) => a.hubId === hubId && a.productId === primaryProduct.productId && a.status === 'Tillgänglig'
      );

      if (asset) {
        const sfRes = await fetch(`${API_BASE}/api/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Hub__c: hubId,
            Asset__c: asset.id,
            StartDateTime__c: `${startDate}T08:00:00Z`,
            EndDateTime__c: `${endDate}T18:00:00Z`,
            Status__c: isExpress ? 'Bokad' : 'Bokad',
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
            ServiceIntervalHours__c: serviceLevelData?.intervalHours || 0,
            IncludesWaterRefill__c: serviceLevelData?.includesWaterRefill || false,
            IncludesCleaning__c: serviceLevelData?.includesCleaning || false,
          }),
        });

        if (sfRes.ok) {
          const sfData = await sfRes.json();
          bookingId = sfData.Name || sfData.id || bookingId;
          realBookingCreated = true;
        }
      }
    } catch (e) {
      console.warn('Could not create Salesforce booking, using mock:', e);
    }

    const response = {
      bookingId,
      status: isExpress ? 'Bokad' : 'Bokad',
      totalPrice,
      breakdown: {
        toiletRental: price.toiletRental,
        addons: price.addons,
        delivery: price.delivery,
        expressFee: price.expressFee,
        serviceFee,
        total: totalPrice,
      },
      hubName: hub?.name || bestHubResult?.hub?.name || 'Okänd hub',
      distanceKm,
      isExpress,
      serviceLevel,
      realBookingCreated,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Kunde inte skapa bokning.' }, { status: 500 });
  }
}