import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://salesforce-backend-zeta.vercel.app';

// GET /api/availability?productId=...&startDate=...&endDate=...&postalCode=...&hubId=...
// Proxar till backendens /api/catalog/availability och beräknar för en specifik produkt.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const hubId = searchParams.get('hubId');

  if (!productId || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'productId, startDate och endDate krävs' },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({ fromDate: startDate, toDate: endDate });
    if (hubId) params.set('hubId', hubId);
    const res = await fetch(`${BACKEND_URL}/api/catalog/availability?${params}`);
    if (!res.ok) {
      return NextResponse.json({ error: `Backend ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    // Räkna tillgänglighet för (hubId, productId) — eller summera över alla hubs om hubId saknas
    let availableCount = 0;
    if (hubId) {
      availableCount = data.availability?.[hubId]?.[productId] ?? 0;
    } else {
      for (const h of Object.values(data.availability || {})) {
        const hub = h as Record<string, number>;
        availableCount += hub[productId] ?? 0;
      }
    }
    return NextResponse.json({
      available: availableCount > 0,
      availableCount,
    });
  } catch (error) {
    console.error('Availability error:', error);
    return NextResponse.json(
      { error: 'Kunde inte kontrollera tillgänglighet' },
      { status: 500 }
    );
  }
}
