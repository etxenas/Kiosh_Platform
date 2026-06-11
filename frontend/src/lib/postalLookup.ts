/**
 * Slå upp postort från svenskt postnummer.
 * Använder zippopotam.us (gratis, ingen API-nyckel).
 *
 * Returns: postort eller null om okänt/fel.
 */

const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

export async function lookupCityFromPostalCode(postalCode: string): Promise<string | null> {
  const clean = postalCode.replace(/\s/g, '');
  if (clean.length !== 5 || !/^\d{5}$/.test(clean)) return null;

  if (cache.has(clean)) return cache.get(clean) ?? null;
  if (inflight.has(clean)) return inflight.get(clean)!;

  const promise = (async () => {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`https://api.zippopotam.us/se/${clean}`, {
        signal: ctrl.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        cache.set(clean, null);
        return null;
      }
      const data = await res.json();
      const place = data?.places?.[0]?.['place name'];
      const city = typeof place === 'string' && place.length > 0 ? place : null;
      cache.set(clean, city);
      return city;
    } catch {
      // Cacha inte fel — användaren kan vilja prova igen
      return null;
    } finally {
      inflight.delete(clean);
    }
  })();

  inflight.set(clean, promise);
  return promise;
}
