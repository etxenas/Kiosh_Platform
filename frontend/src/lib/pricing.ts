/**
 * Pricing & affärsregler — express-avgift, dagberäkning, total.
 * Tar produkt-priser (inkl. långhyra-rabatt) från SF-katalogen istället för hårdkodade konstanter.
 *
 * Långhyra-modellen (per produkt, läses från Product2 custom fields):
 * - Dag 1..fullPriceDays: pricePerDay (full pris)
 * - Dag fullPriceDays+1..N: longRentalDailyRate
 *
 * Om en produkt saknar långhyra-fält i SF används default-fallback nedan.
 */

import { SelectedProduct, Product } from './types';

export const EXPRESS_FEE = 500;
export const EXPRESS_CUTOFF_DAYS = 3;

/** Default-fallback om Product2 saknar långhyra-fält. */
export const DEFAULT_FULL_PRICE_DAYS = 4;
export const DEFAULT_LONG_RENTAL_DAILY_RATE = 50;

/** Är beställningen express (≤ EXPRESS_CUTOFF_DAYS från idag)? */
export function isExpressOrder(startDate: string): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= EXPRESS_CUTOFF_DAYS && diffDays >= 0;
}

/** Antal dagar mellan två datum (minst 1). */
export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

/** Hitta produkt från en lista (toaletter eller addons). */
function findProduct(productId: string, products: Product[]): Product | undefined {
  return products.find((x) => x.id === productId);
}

/** Hitta produktnamn från en lista. */
export function nameForProduct(productId: string, products: Product[]): string {
  return findProduct(productId, products)?.name || productId;
}

/** Hämta långhyra-parametrar för en produkt (med fallback). */
export function longRentalParamsFor(product: Product | undefined): {
  fullPriceDays: number;
  longRentalDailyRate: number;
} {
  return {
    fullPriceDays: product?.fullPriceDays ?? DEFAULT_FULL_PRICE_DAYS,
    longRentalDailyRate: product?.longRentalDailyRate ?? DEFAULT_LONG_RENTAL_DAILY_RATE,
  };
}

/**
 * Räknar hyrkostnad för en produkt över numberOfDays dagar.
 * - Dag 1..fullPriceDays: pricePerDay
 * - Dag fullPriceDays+1..N: longRentalDailyRate
 */
export function rentalCostForProduct(
  pricePerDay: number,
  numberOfDays: number,
  quantity: number,
  fullPriceDays: number = DEFAULT_FULL_PRICE_DAYS,
  longRentalDailyRate: number = DEFAULT_LONG_RENTAL_DAILY_RATE
): {
  fullPriceTotal: number;
  longRentalTotal: number;
  total: number;
  fullDays: number;
  longDays: number;
  fullPriceDays: number;
  longRentalDailyRate: number;
} {
  const fullDays = Math.min(numberOfDays, fullPriceDays);
  const longDays = Math.max(0, numberOfDays - fullPriceDays);
  const fullPriceTotal = fullDays * pricePerDay * quantity;
  const longRentalTotal = longDays * longRentalDailyRate * quantity;
  return {
    fullPriceTotal,
    longRentalTotal,
    total: fullPriceTotal + longRentalTotal,
    fullDays,
    longDays,
    fullPriceDays,
    longRentalDailyRate,
  };
}

export interface PriceBreakdown {
  toiletRental: number;
  toiletRentalFullPrice: number;
  toiletRentalLongRental: number;
  addons: number;
  delivery: number;
  expressFee: number;
  total: number;
  numberOfDays: number;
  /** Hög-vatten-märke (max) över valda produkter — för UI-bannrar. */
  maxFullPriceDays: number;
  /** Om någon produkt har långhyra-rabatt aktiverad (numberOfDays > fullPriceDays). */
  longRentalActive: boolean;
}

export function calculatePrice(
  selectedProducts: SelectedProduct[],
  startDate: string,
  endDate: string,
  addons: { productId: string; quantity: number; pricePerDay: number }[],
  deliveryFee: number,
  toiletCatalog: Product[],
  addonCatalog: Product[] = []
): PriceBreakdown {
  const numberOfDays = daysBetween(startDate, endDate);

  let toiletRentalFullPrice = 0;
  let toiletRentalLongRental = 0;
  let maxFullPriceDays = 0;
  let longRentalActive = false;

  for (const sp of selectedProducts) {
    const product = findProduct(sp.productId, toiletCatalog);
    const { fullPriceDays, longRentalDailyRate } = longRentalParamsFor(product);
    const pricePerDay = product?.pricePerDay ?? 0;
    const breakdown = rentalCostForProduct(
      pricePerDay,
      numberOfDays,
      sp.quantity,
      fullPriceDays,
      longRentalDailyRate
    );
    toiletRentalFullPrice += breakdown.fullPriceTotal;
    toiletRentalLongRental += breakdown.longRentalTotal;
    if (fullPriceDays > maxFullPriceDays) maxFullPriceDays = fullPriceDays;
    if (breakdown.longDays > 0) longRentalActive = true;
  }
  const toiletRental = toiletRentalFullPrice + toiletRentalLongRental;

  // Addons använder också sin egen långhyra-rabatt om Product2-fältet är satt
  const addonsTotal = addons.reduce((sum, a) => {
    const product = findProduct(a.productId, addonCatalog);
    const { fullPriceDays, longRentalDailyRate } = longRentalParamsFor(product);
    const b = rentalCostForProduct(
      a.pricePerDay,
      numberOfDays,
      a.quantity,
      fullPriceDays,
      longRentalDailyRate
    );
    return sum + b.total;
  }, 0);

  const expressFee = isExpressOrder(startDate) ? EXPRESS_FEE : 0;
  const total = toiletRental + addonsTotal + deliveryFee + expressFee;

  return {
    toiletRental,
    toiletRentalFullPrice,
    toiletRentalLongRental,
    addons: addonsTotal,
    delivery: deliveryFee,
    expressFee,
    total,
    numberOfDays,
    maxFullPriceDays: maxFullPriceDays || DEFAULT_FULL_PRICE_DAYS,
    longRentalActive,
  };
}
