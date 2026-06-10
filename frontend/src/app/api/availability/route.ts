import { NextRequest, NextResponse } from 'next/server';
import { products, getAvailableCount, calculatePrice, findBestHub } from '@/lib/mock-data';

// GET /api/availability?productId=...&startDate=...&endDate=...&postalCode=...&hubId=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const postalCode = searchParams.get('postalCode');
  const hubId = searchParams.get('hubId');

  if (!productId || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'productId, startDate och endDate krävs' },
      { status: 400 }
    );
  }

  try {
    const availableCount = getAvailableCount(productId, hubId || undefined);
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return NextResponse.json({ error: 'Produkt hittades inte' }, { status: 404 });
    }

    if (availableCount === 0) {
      return NextResponse.json({
        available: false,
        availableCount: 0,
        pricePerDay: product.pricePerDay,
        estimatedTotal: 0,
        numberOfDays: 0,
      });
    }

    // Beräkna frakt baserat på hub
    let deliveryFee = 800; // default
    if (postalCode && hubId) {
      const bestHub = findBestHub(postalCode, [{ productId, quantity: 1 }]);
      if (bestHub) deliveryFee = bestHub.deliveryFee;
    }

    const price = calculatePrice([{ productId, quantity: 1 }], startDate, endDate, [], deliveryFee);

    return NextResponse.json({
      available: true,
      availableCount,
      pricePerDay: product.pricePerDay,
      estimatedTotal: price.total,
      numberOfDays: price.numberOfDays,
    });
  } catch (error) {
    console.error('Availability error:', error);
    return NextResponse.json(
      { error: 'Kunde inte kontrollera tillgänglighet' },
      { status: 500 }
    );
  }
}
