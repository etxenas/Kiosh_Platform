'use client';

import { useState, useCallback, useEffect } from 'react';
import { BookingState, BookingStep, Addon, SelectedProduct, Hub, ServiceLevelType, Product } from '@/lib/types';
import { fetchHubs, fetchProducts, fetchAddons, fetchAvailability, AvailabilityResult, ReachableHub, findCheapestHubWithAll } from '@/lib/catalog';
import { calculatePrice, isExpressOrder } from '@/lib/pricing';
import StepPostalCode from '@/components/StepPostalCode';
import StepDates from '@/components/StepDates';
import StepProducts from '@/components/StepProducts';
import StepAddons from '@/components/StepAddons';
import StepServiceLevel from '@/components/StepServiceLevel';
import StepReview from '@/components/StepReview';
import StepCustomer from '@/components/StepCustomer';
import StepConfirmation from '@/components/StepConfirmation';
import ProgressBar from '@/components/ProgressBar';
import { trackFunnel, resetSession } from '@/lib/funnel';

const initialBookingState: BookingState = {
  step: 'postalCode',
  postalCode: '',
  customerName: '',
  customerEmail: '',
  selectedHub: null,
  selectedProducts: [],
  startDate: null,
  endDate: null,
  serviceLevel: 'Bas',
  addons: [],
  customer: null,
  deliveryAddress: { street: '', postalCode: '', city: '' },
  deliveryNotes: '',
  hasDifferentBillingAddress: false,
  billingAddress: { street: '', postalCode: '', city: '' },
  billingReference: '',
  billingOrgNumber: '',
  billingCompanyName: '',
  bookingResponse: null,
  isExpress: false,
};

const stepLabels: Record<BookingStep, string> = {
  postalCode: 'Start',
  dates: 'Datum',
  products: 'Toaletter',
  addons: 'Tillval',
  serviceLevel: 'Service',
  review: 'Översikt',
  customer: 'Kontakt',
  confirmation: 'Klart!',
};

const stepIcons: Record<BookingStep, string> = {
  postalCode: '👋',
  dates: '📅',
  products: '🚽',
  addons: '🎁',
  serviceLevel: '🔧',
  review: '💰',
  customer: '📝',
  confirmation: '🎉',
};

const stepOrder: BookingStep[] = ['postalCode', 'dates', 'products', 'addons', 'serviceLevel', 'review', 'customer', 'confirmation'];

export default function BokaPage() {
  const [booking, setBooking] = useState<BookingState>(initialBookingState);
  const [submitting, setSubmitting] = useState(false);

  // updateBooking måste deklareras INNAN effects som använder den. Försökte tidigare i annan ordning.
  // (Kvarvarande deklaration nedan behålls för kompatibilitet — useCallback är idempotent.)
  // SF-katalog: hubs, toaletter, tillval
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [addonProducts, setAddonProducts] = useState<Product[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Tillgänglighet (ändras när datum väljs)
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);

  // Reachable hubs från kundens postnummer (alla i räckvidd), och info om eventuellt hub-byte
  const [reachableHubs, setReachableHubs] = useState<ReachableHub[]>([]);
  const [hubChange, setHubChange] = useState<{ from: string; to: string; extraFee: number } | null>(null);
  const [hubUnavailable, setHubUnavailable] = useState(false);

  // Ladda katalog vid mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [h, p, a] = await Promise.all([fetchHubs(), fetchProducts(), fetchAddons()]);
        if (cancelled) return;
        setHubs(h);
        setProducts(p);
        setAddonProducts(a);
        setCatalogReady(true);
      } catch (e) {
        if (!cancelled) {
          setCatalogError(e instanceof Error ? e.message : 'Kunde inte ladda katalog');
          setCatalogReady(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Ladda tillgänglighet när datum väljs
  useEffect(() => {
    if (!booking.startDate || !booking.endDate) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchAvailability(booking.startDate!, booking.endDate!);
        if (!cancelled) setAvailability(result);
      } catch {
        // tyst fel — fronten visar 0 om result är null/0
      }
    })();
    return () => { cancelled = true; };
  }, [booking.startDate, booking.endDate]);

  // När produkter väljs: kolla om current hub kan tillgodose dem. Annars byt automatiskt.
  // "Vi levererar från en enda hub" — om ingen hub kan tillgodose, visa kontakt-meddelande.
  useEffect(() => {
    if (!availability || reachableHubs.length === 0 || booking.selectedProducts.length === 0) {
      setHubChange(null);
      setHubUnavailable(false);
      return;
    }
    const current = booking.selectedHub;
    const currentHasAll = current && reachableHubs.find(h => h.id === current.id)
      && booking.selectedProducts.every(sp => {
        const c = availability.availability[current.id]?.[sp.productId] ?? 0;
        return c >= sp.quantity;
      });
    if (currentHasAll) {
      setHubChange(null);
      setHubUnavailable(false);
      return;
    }
    // current har inte alla — hitta billigaste hub som har
    const cheapestWithAll = findCheapestHubWithAll(reachableHubs, availability, booking.selectedProducts);
    if (!cheapestWithAll) {
      setHubChange(null);
      setHubUnavailable(true);
      return;
    }
    setHubUnavailable(false);
    if (current && cheapestWithAll.id !== current.id) {
      // Byt hub — visa banner med extra-fee-info
      const extra = cheapestWithAll.deliveryFee - (current.deliveryFee || 0);
      setHubChange({
        from: current.name,
        to: cheapestWithAll.name,
        extraFee: Math.max(0, extra),
      });
      updateBooking({ selectedHub: cheapestWithAll });
    } else {
      setHubChange(null);
    }
    // updateBooking är stabil (useCallback med tom deps), exkluderas från deps för att undvika TDZ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability, reachableHubs, booking.selectedProducts, booking.selectedHub]);

  const currentStepIndex = stepOrder.indexOf(booking.step);

  const updateBooking = useCallback((updates: Partial<BookingState>) => {
    setBooking((prev) => ({ ...prev, ...updates }));
  }, []);

  const goToStep = (step: BookingStep) => {
    setBooking((prev) => ({ ...prev, step }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitBooking = async () => {
    if (booking.selectedProducts.length === 0 || !booking.startDate || !booking.endDate || !booking.customer) return;
    if (submitting) return; // anti-dubbel-submit
    setSubmitting(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: booking.selectedProducts,
          startDate: booking.startDate,
          endDate: booking.endDate,
          serviceLevel: booking.serviceLevel,
          addons: booking.addons,
          customer: booking.customer,
          deliveryAddress: booking.deliveryAddress,
          deliveryNotes: booking.deliveryNotes,
          hubId: booking.selectedHub?.id,
          postalCode: booking.postalCode,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Final tracking: Closed Won + booking id
        trackFunnel('bookingCreated', {
          deliveryAddress: `${booking.deliveryAddress.street}, ${booking.deliveryAddress.postalCode} ${booking.deliveryAddress.city}`,
          totalPrice: data.totalPrice || price?.total,
          bookingId: data.bookingId || data.id,
          customerName: booking.customer ? `${booking.customer.firstName} ${booking.customer.lastName}` : booking.customerName,
          customerEmail: booking.customer?.email || booking.customerEmail,
          customerPhone: booking.customer?.phone,
        });
        updateBooking({ bookingResponse: data, step: 'confirmation' });
      } else {
        alert('Något gick fel: ' + data.error);
      }
    } catch {
      alert('Kunde inte skicka bokningen. Försök igen.');
    } finally {
      setSubmitting(false);
    }
  };

  const isExpress = booking.startDate ? isExpressOrder(booking.startDate) : false;
  const deliveryFee = booking.selectedHub?.deliveryFee || 0;
  const price = booking.startDate && booking.endDate
    ? calculatePrice(
        booking.selectedProducts,
        booking.startDate,
        booking.endDate,
        booking.addons.map((a) => ({ productId: a.productId, quantity: a.quantity, pricePerDay: a.pricePerDay })),
        deliveryFee,
        products,
      )
    : null;

  // Laddningsskydd: visa enkel laddare medan katalogen hämtas
  if (!catalogReady) {
    return (
      <div className="min-h-screen bg-[#FFFDF7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-3 border-[#2D9C4A] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500">Laddar katalog…</p>
        </div>
      </div>
    );
  }
  if (catalogError) {
    return (
      <div className="min-h-screen bg-[#FFFDF7] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Kunde inte ladda katalogen</h2>
          <p className="text-gray-500 text-sm mb-4">{catalogError}</p>
          <button onClick={() => location.reload()} className="bg-[#2D9C4A] text-white px-6 py-3 rounded-xl font-semibold">Försök igen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF7]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#2D9C4A] to-[#1E7A34] text-white">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <p className="text-white/70 text-sm mb-2">{stepIcons[booking.step]} Steg {currentStepIndex + 1} av {stepOrder.length - 1}</p>
          <h1 className="text-2xl md:text-3xl font-extrabold">
            {booking.step === 'confirmation' ? 'Bokning klar! 🎉' : 'Boka hyrtoaletter'}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress bar */}
        {booking.step !== 'confirmation' && (
          <ProgressBar
            steps={stepOrder.slice(0, -1)}
            currentStep={booking.step}
            labels={stepLabels}
          />
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 animate-fade-in">
          {booking.step === 'postalCode' && (
            <StepPostalCode
              postalCode={booking.postalCode}
              customerName={booking.customerName}
              customerEmail={booking.customerEmail}
              deliveryAddress={booking.deliveryAddress}
              selectedHub={booking.selectedHub}
              selectedProducts={booking.selectedProducts}
              hubs={hubs}
              onUpdate={(updates) => {
                updateBooking(updates);
                // Låt boka/page även få reda på alla reachable hubs så vi kan auto-byta senare
                const pc = (updates as { deliveryAddress?: { postalCode?: string } }).deliveryAddress?.postalCode;
                if (pc && pc.replace(/\s/g, '').length === 5) {
                  import('@/lib/catalog').then(({ reachableHubsFor }) => {
                    setReachableHubs(reachableHubsFor(pc, hubs));
                  });
                }
              }}
              onNext={() => goToStep('dates')}
            />
          )}

          {booking.step === 'dates' && (
            <StepDates
              startDate={booking.startDate}
              endDate={booking.endDate}
              onUpdate={(startDate, endDate) => {
                updateBooking({ startDate, endDate });
              }}
              onBack={() => goToStep('postalCode')}
              onNext={() => {
                if (booking.startDate && booking.endDate) {
                  console.log('[funnel] tracking dates', { startDate: booking.startDate, endDate: booking.endDate });
                  trackFunnel('dates', { startDate: booking.startDate, endDate: booking.endDate });
                }
                goToStep('products');
              }}
            />
          )}

          {booking.step === 'products' && (
            <StepProducts
              products={products}
              selectedProducts={booking.selectedProducts}
              selectedHub={booking.selectedHub}
              availability={availability}
              reachableHubs={reachableHubs}
              hubChange={hubChange}
              hubUnavailable={hubUnavailable}
              onUpdate={(selectedProducts: SelectedProduct[]) => updateBooking({ selectedProducts })}
              onBack={() => goToStep('dates')}
              onNext={() => {
                trackFunnel('products', { products: booking.selectedProducts });
                goToStep('addons');
              }}
            />
          )}

          {booking.step === 'addons' && (
            <StepAddons
              addonProducts={addonProducts}
              toiletProducts={products}
              selectedToilets={booking.selectedProducts}
              selectedAddons={booking.addons}
              onUpdate={(addons: Addon[]) => updateBooking({ addons })}
              onBack={() => goToStep('products')}
              onNext={() => {
                trackFunnel('addons', { addons: booking.addons.map(a => ({ productId: a.productId, quantity: a.quantity })) });
                goToStep('serviceLevel');
              }}
            />
          )}

          {booking.step === 'serviceLevel' && (
            <StepServiceLevel
              serviceLevel={booking.serviceLevel}
              days={booking.startDate && booking.endDate
                ? Math.max(1, Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24)))
                : 1}
              basePrice={price?.toiletRental || 0}
              onUpdate={(serviceLevel) => updateBooking({ serviceLevel: serviceLevel as ServiceLevelType })}
              onBack={() => goToStep('addons')}
              onNext={() => {
                trackFunnel('serviceLevel', { serviceLevel: booking.serviceLevel });
                goToStep('review');
              }}
            />
          )}

          {booking.step === 'review' && price && (
            <StepReview
              selectedProducts={booking.selectedProducts}
              startDate={booking.startDate!}
              endDate={booking.endDate!}
              addons={booking.addons}
              selectedHub={booking.selectedHub}
              serviceLevel={booking.serviceLevel}
              price={price}
              isExpress={isExpress}
              products={products}
              onBack={() => goToStep('serviceLevel')}
              onNext={() => {
                trackFunnel('review', { totalPrice: price.total });
                goToStep('customer');
              }}
            />
          )}

          {booking.step === 'customer' && (
            <StepCustomer
              customerName={booking.customerName}
              customerEmail={booking.customerEmail}
              deliveryAddress={booking.deliveryAddress}
              deliveryNotes={booking.deliveryNotes}
              hasDifferentBillingAddress={booking.hasDifferentBillingAddress}
              billingAddress={booking.billingAddress}
              billingReference={booking.billingReference}
              billingOrgNumber={booking.billingOrgNumber}
              billingCompanyName={booking.billingCompanyName}
              onUpdate={(updates) => updateBooking(updates)}
              onBack={() => goToStep('review')}
              onEditContact={() => goToStep('postalCode')}
              onSubmit={handleSubmitBooking}
            />
          )}

          {booking.step === 'confirmation' && booking.bookingResponse && (
            <StepConfirmation
              bookingResponse={booking.bookingResponse}
              selectedHub={booking.selectedHub}
              onNewBooking={() => { resetSession(); setBooking(initialBookingState); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}