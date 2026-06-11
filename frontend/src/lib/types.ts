// Typer för bokningssystemet v2

export type AssetStatus = 'Tillgänglig' | 'Bokad' | 'Uthyrd' | 'Service' | 'Pensionerad';
export type BookingStatus = 'Bokad' | 'Bekräftad' | 'Utleverans' | 'Levererad' | 'Inleverans' | 'Tvätt/genomgång' | 'Avslutad' | 'Avbokad';
export type ServiceLevelType = 'Bas' | 'Standard' | 'Premium';
export type ProductFamily = 'Toalett' | 'Tillval' | 'Tjänst';

export interface Product {
  id: string;
  name: string;
  productCode: string;
  family: ProductFamily;
  description: string;
  pricePerDay: number;
  imageUrl?: string;
  /** Långhyra-rabatt: dagspris efter fullPriceDays dagar. Null = ingen rabatt konfigurerad. */
  longRentalDailyRate?: number | null;
  /** Antal dagar med fullt pricePerDay innan rabatten slår in. Null = default 4. */
  fullPriceDays?: number | null;
}

export interface Asset {
  id: string;
  name: string;
  serialNumber: string;
  productId: string;
  hubId: string;
  status: AssetStatus;
}

export interface Hub {
  id: string;
  name: string;
  postalCode: string;
  address: string;
  maxDeliveryRadiusKm: number;
  mediumRadiusKm: number;
  farRadiusKm: number;
  baseDeliveryFee: number;
  mediumDeliveryFee: number;
  farDeliveryFee: number;
  distanceKm?: number;   // beräknat avstånd från kund
  deliveryFee?: number;  // beräknad fraktkostnad
}

export interface HubCheckResult {
  hub: Hub;
  distanceKm: number;
  deliveryFee: number;
  available: boolean;      // har alla önskade toaletter?
  availableProducts: Array<{ productId: string; count: number }>;
}

// En vald produkt med kvantitet i bokningen
export interface SelectedProduct {
  productId: string;
  quantity: number;
}

// Tillval kopplat till en specifik produkt i bokningen
export interface Addon {
  productId: string;
  productName: string;
  parentProductId: string;
  quantity: number;
  pricePerDay: number;
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface DeliveryAddress {
  street: string;
  postalCode: string;
  city: string;
}

export interface BookingRequest {
  products: SelectedProduct[];
  startDate: string;
  endDate: string;
  addons: Addon[];
  customer: CustomerInfo;
  deliveryAddress: string;
  deliveryNotes?: string;
  hubId?: string;
  postalCode?: string;
}

export interface AvailabilityResponse {
  available: boolean;
  availableCount: number;
  pricePerDay: number;
  estimatedTotal: number;
  numberOfDays: number;
}

export interface BookingResponse {
  bookingId: string;
  status: BookingStatus;
  totalPrice: number;
  breakdown: {
    toiletRental: number;
    addons: number;
    delivery: number;
    expressFee: number;
    serviceFee?: number;
    total: number;
  };
  hubName?: string;
  distanceKm?: number;
  isExpress?: boolean;
  serviceLevel?: string;
  realBookingCreated?: boolean;
}

// Steg i bokningsflödet (postnummer tillagt först)
export type BookingStep = 'postalCode' | 'dates' | 'products' | 'addons' | 'serviceLevel' | 'review' | 'customer' | 'confirmation';

export interface BookingState {
  step: BookingStep;
  postalCode: string;
  customerName: string;
  customerEmail: string;
  selectedHub: Hub | null;
  selectedProducts: SelectedProduct[];
  startDate: string | null;
  endDate: string | null;
  serviceLevel: ServiceLevelType;
  addons: Addon[];
  customer: CustomerInfo | null;
  deliveryAddress: DeliveryAddress;
  deliveryNotes: string;
  hasDifferentBillingAddress: boolean;
  billingAddress: DeliveryAddress;
  billingReference: string;
  billingOrgNumber: string;
  billingCompanyName: string;
  bookingResponse: BookingResponse | null;
  isExpress: boolean;
}
