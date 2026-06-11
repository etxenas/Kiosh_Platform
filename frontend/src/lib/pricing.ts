/**
 * Pricing & affärsregler — express-avgift, dagberäkning, total.
 * Tar produkt-priser som inparameter (från catalog/SF) istället för mock-lookup.
 *
 * Långhyra-rabatt (2026-06-11):
 * - Dag 1-4: full pris/dag/st
 * - Dag 5+: LONG_RENTAL_DAILY_RATE (50 kr/dag/st) — matchar Sanifix Holken-modellen
 *
 * Detta gör att korta hyror (typ helger, evenemang) får marknadspris medan
 * långhyror (bygg-projekt etc) inte blir prohibitivt dyra.
 */

import { SelectedProduct, Product } from './types';

export const EXPRESS_FEE = 500;
export const EXPRESS_CUTOFF_DAYS = 3;

/** Antal dagar med full prissättning innan långhyra-rabatt slår in. */
export const FULL_PRICE_DAYS = 4;

/** Dagspris per toalett efter FULL_PRICE_DAYS dagar (Sanifix-matchat). */
export const LONG_RENTAL_DAILY_RATE = 50;

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

/** Hitta produkt-pris från en lista (toaletter eller addons). */
function priceForProduct(productId: string, products: Product[]): number {
  const p = products.find((x) => x.id === productId);
  return p ? p.pricePerDay : 0;
}

/** Hitta produktnamn från en lista. */
export function nameForProduct(productId: string, products: Product[]): string {
  const p = products.find((x) => x.id === productId);
  return p ? p.name : productId;
}

/**
 * Räknar ut hyrkostnad för en toalett över numberOfDays dagar.
 * - Dag 1..FULL_PRICE_DAYS: pricePerDay
 * - Dag FULL_PRICE_DAYS+1..N: LONG_RENTAL_DAILY_RATE
 */
export function rentalCostForProduct(
  pricePerDay: number,
  numberOfDays: number,
  quantity: number
): { fullPriceTotal: number; longRentalTotal: number; total: number; fullDays: number; longDays: number } {
  const fullDays = Math.min(numberOfDays, FULL_PRICE_DAYS);
  const longDays = Math.max(0, numberOfDays - FULL_PRICE_DAYS);
  const fullPriceTotal = fullDays * pricePerDay * quantity;
  const longRentalTotal = longDays * LONG_RENTAL_DAILY_RATE * quantity;
  return {
    fullPriceTotal,
    longRentalTotal,
    total: fullPriceTotal + longRentalTotal,
    fullDays,
    longDays,
  };
}

export interface PriceBreakdown {
  toiletRental: number;
  toiletRentalFullPrice: number;   // Bidrag från dag 1-4
  toiletRentalLongRental: number;  // Bidrag från dag 5+
  addons: number;
  delivery: number;
  expressFee: number;
  total: number;
  numberOfDays: number;
  fullPriceDays: number;
  longRentalDays: number;
  longRentalDailyRate: number;
}

export function calculatePrice(
  selectedProducts: SelectedProduct[],
  startDate: string,
  endDate: string,
  addons: { productId: string; quantity: number; pricePerDay: number }[],
  deliveryFee: number,
  toiletCatalog: Product[]
): PriceBreakdown {
  const numberOfDays = daysBetween(startDate, endDate);
  const fullPriceDays = Math.min(numberOfDays, FULL_PRICE_DAYS);
  const longRentalDays = Math.max(0, numberOfDays - FULL_PRICE_DAYS);

  let toiletRentalFullPrice = 0;
  let toiletRentalLongRental = 0;
  for (const sp of selectedProducts) {
    const price = priceForProduct(sp.productId, toiletCatalog);
    const breakdown = rentalCostForProduct(price, numberOfDays, sp.quantity);
    toiletRentalFullPrice += breakdown.fullPriceTotal;
    toiletRentalLongRental += breakdown.longRentalTotal;
  }
  const toiletRental = toiletRentalFullPrice + toiletRentalLongRental;

  // Addons använder samma långhyra-modell (samma rationell: extra service-volym).
  const addonsTotal = addons.reduce((sum, a) => {
    const b = rentalCostForProduct(a.pricePerDay, numberOfDays, a.quantity);
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
    fullPriceDays,
    longRentalDays,
    longRentalDailyRate: LONG_RENTAL_DAILY_RATE,
  };
}
