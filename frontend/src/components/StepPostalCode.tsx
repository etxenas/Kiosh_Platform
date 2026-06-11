'use client';

/// <reference types="@types/google.maps" />

import { useState, useEffect, useRef } from 'react';
import { Hub, SelectedProduct, DeliveryAddress } from '@/lib/types';
import { findHubsForPostalCode, findBestHub } from '@/lib/mock-data';
import { trackFunnel } from '@/lib/funnel';
import { lookupCityFromPostalCode } from '@/lib/postalLookup';

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(); return; }
    if (window.google?.maps?.places) { resolve(); return; }
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      const check = setInterval(() => {
        if (window.google?.maps?.places) { clearInterval(check); resolve(); }
      }, 200);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=sv`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

interface Props {
  postalCode: string;
  customerName: string;
  customerEmail: string;
  deliveryAddress: DeliveryAddress;
  selectedHub: Hub | null;
  selectedProducts: SelectedProduct[];
  onUpdate: (updates: {
    postalCode: string;
    customerName: string;
    customerEmail: string;
    deliveryAddress: DeliveryAddress;
    selectedHub: Hub | null;
  }) => void;
  onNext: () => void;
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export default function StepPostalCode({
  postalCode: initialPc,
  customerName: initialName,
  customerEmail: initialEmail,
  deliveryAddress: initialAddress,
  selectedHub: initialHub,
  selectedProducts,
  onUpdate,
  onNext,
}: Props) {
  const [customerName, setCustomerName] = useState(initialName);
  const [customerEmail, setCustomerEmail] = useState(initialEmail);
  const [street, setStreet] = useState(initialAddress?.street || '');
  const [postalCode, setPostalCode] = useState(initialPc || initialAddress?.postalCode || '');
  const [city, setCity] = useState(initialAddress?.city || '');
  const [checking, setChecking] = useState(false);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [chosenHub, setChosenHub] = useState<Hub | null>(initialHub);
  const [placesReady, setPlacesReady] = useState(false);
  const [cityLookup, setCityLookup] = useState(false);
  const [cityAutoFilled, setCityAutoFilled] = useState(false);

  const autocompleteRef = useRef<HTMLInputElement>(null);
  const placesAutocomplete = useRef<google.maps.places.Autocomplete | null>(null);

  // Load Google Maps
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    loadGoogleMapsScript(apiKey).then(() => setPlacesReady(true));
  }, []);

  // Wire up autocomplete
  useEffect(() => {
    if (!placesReady || !autocompleteRef.current) return;
    placesAutocomplete.current = new google.maps.places.Autocomplete(autocompleteRef.current, {
      componentRestrictions: { country: 'se' },
      fields: ['address_components'],
      types: ['address'],
    });
    placesAutocomplete.current.addListener('place_changed', () => {
      const place = placesAutocomplete.current?.getPlace();
      if (!place?.address_components) return;
      let streetName = '', streetNumber = '', pc = '', ct = '';
      for (const c of place.address_components) {
        if (c.types.includes('route')) streetName = c.long_name;
        if (c.types.includes('street_number')) streetNumber = c.long_name;
        if (c.types.includes('postal_code')) pc = c.long_name;
        if (c.types.includes('postal_town') || c.types.includes('locality')) ct = c.long_name;
        if (!ct && c.types.includes('administrative_area_level_2')) ct = c.long_name;
      }
      const fullStreet = [streetName, streetNumber].filter(Boolean).join(' ');
      if (fullStreet) setStreet(fullStreet);
      if (pc) {
        setPostalCode(pc);
        doCheck(pc);
      }
      if (ct) setCity(ct);
    });
  }, [placesReady]);

  // Auto-check on mount if we have a postal code
  useEffect(() => {
    if (postalCode.replace(/\s/g, '').length >= 5) {
      doCheck(postalCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slå upp postort när postnumret är 5 siffror — men inte om användaren redan skrivit en stad manuellt
  const tryLookupCity = async (pc: string) => {
    const clean = pc.replace(/\s/g, '');
    if (clean.length !== 5 || !/^\d{5}$/.test(clean)) return;
    // Skriv inte över om användaren själv fyllt i något som inte är autofyllt
    if (city.trim() && !cityAutoFilled) return;
    setCityLookup(true);
    const found = await lookupCityFromPostalCode(clean);
    setCityLookup(false);
    if (found) {
      setCity(found);
      setCityAutoFilled(true);
    }
  };

  const doCheck = (pc: string) => {
    const clean = pc.replace(/\s/g, '');
    if (clean.length < 5) return;

    // Autofyll postort parallellt med hub-koll
    tryLookupCity(clean);

    setChecking(true);
    setTimeout(() => {
      const reachableHubs = findHubsForPostalCode(clean);
      setHubs(reachableHubs);

      // Behåll befintligt val om det fortfarande är i listan, annars välj bästa
      const stillValid = chosenHub && reachableHubs.find((h) => h.id === chosenHub.id);
      let pickedHub: Hub | null = null;
      if (stillValid) {
        // Refresh distanceKm/deliveryFee från ny lookup
        pickedHub = reachableHubs.find((h) => h.id === stillValid.id) || stillValid;
      } else {
        const best = selectedProducts.length > 0 ? findBestHub(clean, selectedProducts) : null;
        pickedHub = best?.hub || reachableHubs[0] || null;
      }
      setChosenHub(pickedHub);
      setChecking(false);
    }, 400);
  };

  const cleanPc = postalCode.replace(/\s/g, '');
  const nameValid = customerName.trim().length >= 2;
  const emailValid = isValidEmail(customerEmail.trim());
  const pcValid = cleanPc.length >= 5;
  const streetValid = street.trim().length >= 3;
  const cityValid = city.trim().length >= 2;
  const formReady = nameValid && emailValid && pcValid && streetValid && cityValid;
  const canContinue = formReady && chosenHub !== null && hubs.length > 0;

  const handlePcChange = (v: string) => {
    setPostalCode(v);
    // Om PC ändras — släpp "autofyllt"-flaggan om det inte längre matchar
    if (cityAutoFilled && v.replace(/\s/g, '').length < 5) {
      setCity('');
      setCityAutoFilled(false);
    }
    if (v.replace(/\s/g, '').length >= 5) doCheck(v);
  };

  const handleSelectHub = (hub: Hub) => {
    setChosenHub(hub);
  };

  const handleContinue = () => {
    if (!canContinue || !chosenHub) return;
    const addr: DeliveryAddress = {
      street: street.trim(),
      postalCode: cleanPc,
      city: city.trim(),
    };
    onUpdate({
      postalCode: cleanPc,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      deliveryAddress: addr,
      selectedHub: chosenHub,
    });
    console.log('[funnel] tracking postalCode', { postalCode: cleanPc, hub: chosenHub.name });
    trackFunnel('postalCode', {
      postalCode: cleanPc,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      hubId: chosenHub.id,
      deliveryAddress: `${addr.street}, ${addr.postalCode} ${addr.city}`,
    });
    onNext();
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-5xl block mb-3">👋</span>
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-1">
          Vart ska toaletten levereras?
        </h2>
        <p className="text-gray-500">Vi behöver dina kontaktuppgifter och leveransadress</p>
      </div>

      {/* KONTAKT */}
      <div className="space-y-4 mb-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Namn</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="För- och efternamn"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:ring-2 focus:ring-[#2D9C4A] focus:border-[#2D9C4A] outline-none transition-colors"
            autoComplete="name"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-post</label>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="din@epost.se"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:ring-2 focus:ring-[#2D9C4A] focus:border-[#2D9C4A] outline-none transition-colors"
            autoComplete="email"
          />
          {customerEmail.length > 3 && !emailValid && (
            <p className="text-xs text-red-500 mt-1">Ogiltig e-postadress</p>
          )}
        </div>
      </div>

      {/* LEVERANSADRESS */}
      <div className="bg-gradient-to-br from-[#FFF8F0] to-[#FFF0E0] rounded-2xl p-5 border border-orange-100 mb-5">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          🏠 Leveransadress
        </h3>

        {placesReady && (
          <div className="mb-3">
            <input
              ref={autocompleteRef}
              type="text"
              placeholder="🔍 Sök adress..."
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-[#2D9C4A] focus:border-[#2D9C4A] outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">Skriv adressen så fylls fälten nedan</p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gatuadress</label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Storgatan 1"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 bg-white focus:ring-2 focus:ring-[#2D9C4A] focus:border-[#2D9C4A] outline-none transition-colors"
              autoComplete="street-address"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Postnummer</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => handlePcChange(e.target.value)}
                placeholder="123 45"
                maxLength={6}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-center font-medium tracking-widest focus:ring-2 focus:ring-[#2D9C4A] focus:border-[#2D9C4A] outline-none transition-colors"
                inputMode="numeric"
                autoComplete="postal-code"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Postort
                {cityLookup && <span className="text-xs text-gray-400 font-normal ml-2">söker…</span>}
                {!cityLookup && cityAutoFilled && (
                  <span className="text-xs text-[#2D9C4A] font-normal ml-2">✓ autofyllt</span>
                )}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => { setCity(e.target.value); setCityAutoFilled(false); }}
                placeholder={cityLookup ? 'Söker…' : 'Stockholm'}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 focus:ring-2 focus:ring-[#2D9C4A] focus:border-[#2D9C4A] outline-none transition-colors"
                autoComplete="address-level2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* HUB-VAL */}
      {checking && (
        <div className="text-center py-6">
          <div className="animate-spin w-7 h-7 border-3 border-[#2D9C4A] border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Söker hubbar i ditt område...</p>
        </div>
      )}

      {!checking && pcValid && hubs.length > 0 && (
        <div className="space-y-2 mb-6 animate-fade-in">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            ✓ Välj hub ({hubs.length} {hubs.length === 1 ? 'tillgänglig' : 'tillgängliga'})
          </p>
          {hubs.map((hub) => {
            const isChosen = chosenHub?.id === hub.id;
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => handleSelectHub(hub)}
                className={`w-full text-left rounded-xl p-3 border-2 transition-all ${
                  isChosen
                    ? 'border-[#2D9C4A] bg-green-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">
                      {hub.name}
                      {isChosen && <span className="text-[#2D9C4A] text-xs ml-2">✓ Vald</span>}
                    </p>
                    <p className="text-xs text-gray-500">{hub.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-gray-900">{hub.distanceKm} km</p>
                    <p className="text-xs text-[#FF6B35] font-medium">{hub.deliveryFee} kr</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!checking && pcValid && hubs.length === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center mb-6">
          <p className="text-red-700 font-semibold text-sm">😔 Vi levererar tyvärr inte hit</p>
          <p className="text-red-500 text-xs mt-1">Testa ett annat postnummer.</p>
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full bg-gradient-to-r from-[#FF6B35] to-[#E55A2B] text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
      >
        {!nameValid ? 'Fyll i namn' :
         !emailValid ? 'Fyll i e-post' :
         !streetValid ? 'Fyll i gatuadress' :
         !pcValid ? 'Fyll i postnummer' :
         !cityValid ? 'Fyll i postort' :
         hubs.length === 0 ? 'Hittar ingen hub' :
         !chosenHub ? 'Välj hub' :
         'Fortsätt →'}
      </button>
    </div>
  );
}
