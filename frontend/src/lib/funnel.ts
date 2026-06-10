// Funnel tracking — fire-and-forget POST to backend, upserts Opportunity in Salesforce.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3200';
const SESSION_KEY = 'hyrto_funnel_session';

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = (crypto.randomUUID?.() || `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export function resetSession() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_KEY);
}

export type FunnelStep =
  | 'postalCode'
  | 'dates'
  | 'products'
  | 'addons'
  | 'serviceLevel'
  | 'review'
  | 'customer'
  | 'bookingCreated'
  | 'abandoned';

export interface FunnelData {
  postalCode?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  hubId?: string;
  startDate?: string;
  endDate?: string;
  serviceLevel?: string;
  products?: Array<{ productId: string; quantity: number }>;
  addons?: Array<{ productId: string; quantity: number }>;
  deliveryAddress?: string;
  totalPrice?: number;
  bookingId?: string;
}

/** Fire-and-forget. Never blocks UX, never throws. */
export function trackFunnel(step: FunnelStep, data: FunnelData = {}) {
  if (typeof window === 'undefined') return;
  const sessionId = getSessionId();
  if (!sessionId) return;

  const url = `${API_BASE}/api/funnel/track`;
  console.log('[funnel] →', step, { sessionId, url, data });

  try {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, step, data }),
      keepalive: true,
    })
      .then((res) => res.json().then((j) => ({ status: res.status, body: j })))
      .then((r) => console.log('[funnel] ←', step, r))
      .catch((e) => console.warn('[funnel] error', step, e));
  } catch (e) {
    console.warn('[funnel] throw', step, e);
  }
}
