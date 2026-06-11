/**
 * Pricing & affärsregler — express-avgift, dagberäkning, total.
 * Tar produkt-priser som inparameter (från catalog/SF) istället för mock-lookup.
 */

import { SelectedProduct, Product } from './types';

export const EXPRESS_FEE = 500;
export const EXPRESS_CUTOFF_DAYS = 3;

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

export interface PriceBreakdown {
  toiletRental: number;
  addons: number;
  delivery: number;
  expressFee: number;
  total: number;
  numberOfDays: number;
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

  const toiletRental = selectedProducts.reduce((sum, sp) => {
    return sum + numberOfDays * priceForProduct(sp.productId, toiletCatalog) * sp.quantity;
  }, 0);

  const addonsTotal = addons.reduce(
    (sum, a) => sum + numberOfDays * a.pricePerDay * a.quantity,
    0
  );

  const expressFee = isExpressOrder(startDate) ? EXPRESS_FEE : 0;
  const total = toiletRental + addonsTotal + deliveryFee + expressFee;

  return { toiletRental, addons: addonsTotal, delivery: deliveryFee, expressFee, total, numberOfDays };
}
