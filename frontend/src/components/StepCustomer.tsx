'use client';

/// <reference types="@types/google.maps" />

import { useState, useRef, useEffect } from 'react';
import { CustomerInfo, DeliveryAddress } from '@/lib/types';
import { lookupCityFromPostalCode } from '@/lib/postalLookup';

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
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
  customerName: string;
  customerEmail: string;
  deliveryAddress: DeliveryAddress;
  deliveryNotes: string;
  hasDifferentBillingAddress: boolean;
  billingAddress: DeliveryAddress;
  billingReference: string;
  billingOrgNumber: string;
  billingCompanyName: string;
  onUpdate: (updates: {
    customer: CustomerInfo;
    deliveryNotes: string;
    hasDifferentBillingAddress: boolean;
    billingAddress: DeliveryAddress;
    billingReference: string;
    billingOrgNumber: string;
    billingCompanyName: string;
  }) => void;
  onBack: () => void;
  onEditContact: () => void;
  onSubmit: () => void;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export default function StepCustomer({
  customerName,
  customerEmail,
  deliveryAddress,
  deliveryNotes,
  hasDifferentBillingAddress: initialDiff,
  billingAddress: initialBilling,
  billingReference: initialBillingRef,
  billingOrgNumber: initialOrgNumber,
  billingCompanyName: initialCompanyName,
  onUpdate,
  onBack,
  onEditContact,
  onSubmit,
}: Props) {
  const { firstName: initFirst, lastName: initLast } = splitName(customerName);
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState(deliveryNotes);
  const [billingReference, setBillingReference] = useState(initialBillingRef);
  const [hasDifferent, setHasDifferent] = useState(initialDiff);
  const [billingStreet, setBillingStreet] = useState(initialBilling?.street || deliveryAddress.street);
  const [billingPostalCode, setBillingPostalCode] = useState(initialBilling?.postalCode || deliveryAddress.postalCode);
  const [billingCity, setBillingCity] = useState(initialBilling?.city || deliveryAddress.city);
  const [billingOrgNumber, setBillingOrgNumber] = useState(initialOrgNumber);
  const [billingCompanyName, setBillingCompanyName] = useState(initialCompanyName);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placesReady, setPlacesReady] = useState(false);
  const [billingCityLookup, setBillingCityLookup] = useState(false);
  const [billingCityAutoFilled, setBillingCityAutoFilled] = useState(false);

  const autocompleteRef = useRef<HTMLInputElement>(null);
  const placesAutocomplete = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    loadGoogleMapsScript(apiKey).then(() => setPlacesReady(true));
  }, []);

  useEffect(() => {
    if (!placesReady || !hasDifferent || !autocompleteRef.current) return;
    if (placesAutocomplete.current) return; // already wired

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
      }
      const fullStreet = [streetName, streetNumber].filter(Boolean).join(' ');
      if (fullStreet) setBillingStreet(fullStreet);
      if (pc) setBillingPostalCode(pc);
      if (ct) setBillingCity(ct);
    });
  }, [placesReady, hasDifferent]);

  // Autofyll fakturapostort från postnummer
  const tryLookupBillingCity = async (pc: string) => {
    const clean = pc.replace(/\s/g, '');
    if (clean.length !== 5 || !/^\d{5}$/.test(clean)) return;
    if (billingCity.trim() && !billingCityAutoFilled) return;
    setBillingCityLookup(true);
    const found = await lookupCityFromPostalCode(clean);
    setBillingCityLookup(false);
    if (found) {
      setBillingCity(found);
      setBillingCityAutoFilled(true);
    }
  };

  const handleBillingPcChange = (v: string) => {
    setBillingPostalCode(v);
    if (billingCityAutoFilled && v.replace(/\s/g, '').length < 5) {
      setBillingCity('');
      setBillingCityAutoFilled(false);
    }
    if (v.replace(/\s/g, '').length >= 5) tryLookupBillingCity(v);
  };

  // När man bockar i "annan fakturaadress" — prefill med leveransadress
  useEffect(() => {
    if (hasDifferent && !billingStreet) {
      setBillingStreet(deliveryAddress.street);
      setBillingPostalCode(deliveryAddress.postalCode);
      setBillingCity(deliveryAddress.city);
    }
  }, [hasDifferent, deliveryAddress, billingStreet]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!phone.trim()) e.phone = 'Telefon krävs';
    if (hasDifferent) {
      if (!billingStreet.trim()) e.billingStreet = 'Gatuadress krävs';
      if (!billingPostalCode.trim()) e.billingPostalCode = 'Postnummer krävs';
      if (!billingCity.trim()) e.billingCity = 'Postort krävs';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const billing: DeliveryAddress = hasDifferent
      ? { street: billingStreet.trim(), postalCode: billingPostalCode.trim(), city: billingCity.trim() }
      : { ...deliveryAddress };
    onUpdate({
      customer: { firstName: initFirst, lastName: initLast, email: customerEmail, phone },
      deliveryNotes: notes,
      hasDifferentBillingAddress: hasDifferent,
      billingAddress: billing,
      billingReference: billingReference.trim(),
      billingOrgNumber: hasDifferent ? billingOrgNumber.trim() : '',
      billingCompanyName: hasDifferent ? billingCompanyName.trim() : '',
    });
    onSubmit();
  };

  const inputClass = (field: string) =>
    `w-full rounded-xl border-2 px-4 py-3 focus:ring-2 focus:ring-[#2D9C4A] focus:border-[#2D9C4A] outline-none transition-colors ${
      errors[field] ? 'border-red-300 bg-red-50' : 'border-gray-200'
    }`;

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-5xl block mb-3">📝</span>
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-1">
          Sista detaljerna
        </h2>
        <p className="text-gray-500">Telefon, ev. fakturaadress, och sen är vi klara</p>
      </div>

      <div className="space-y-5 mb-8">
        {/* Befintliga uppgifter — read-only sammanfattning */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">
                ✓ Dina uppgifter
              </p>
              <p className="font-bold text-gray-900 truncate">{customerName || '(inget namn)'}</p>
              <p className="text-sm text-gray-600 truncate">{customerEmail || '(ingen epost)'}</p>
              <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-green-200">
                🏠 {deliveryAddress.street}, {deliveryAddress.postalCode} {deliveryAddress.city}
              </p>
            </div>
            <button
              type="button"
              onClick={onEditContact}
              className="text-xs text-[#2D9C4A] hover:underline font-semibold whitespace-nowrap"
            >
              Ändra
            </button>
          </div>
        </div>

        {/* Telefon */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefon *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass('phone')}
            placeholder="070-123 45 67"
            autoComplete="tel"
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>

        {/* Faktura */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📄</span>
            <h3 className="text-sm font-bold text-gray-800">Faktura</h3>
          </div>

          {/* Fakturareferens — alltid synlig */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Fakturareferens <span className="text-gray-400 font-normal">(frivilligt)</span>
            </label>
            <input
              type="text"
              value={billingReference}
              onChange={(e) => setBillingReference(e.target.value)}
              placeholder="T.ex. PO-nummer, projekt eller kostnadsställe"
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#2D9C4A] focus:border-[#2D9C4A] outline-none transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1">Hamnar på fakturan om angiven</p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasDifferent}
              onChange={(e) => setHasDifferent(e.target.checked)}
              className="w-5 h-5 rounded text-[#2D9C4A] focus:ring-[#2D9C4A] cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-700">
              Använd annan fakturaadress
            </span>
          </label>

          {hasDifferent && (
            <div className="mt-4 space-y-3 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Företagsnamn</label>
                  <input
                    type="text"
                    value={billingCompanyName}
                    onChange={(e) => setBillingCompanyName(e.target.value)}
                    placeholder="Acme AB"
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#2D9C4A] focus:border-[#2D9C4A] outline-none"
                    autoComplete="organization"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Organisationsnummer</label>
                  <input
                    type="text"
                    value={billingOrgNumber}
                    onChange={(e) => setBillingOrgNumber(e.target.value)}
                    placeholder="556677-8899"
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#2D9C4A] focus:border-[#2D9C4A] outline-none"
                    inputMode="numeric"
                  />
                </div>
              </div>
              {placesReady && (
                <div>
                  <input
                    ref={autocompleteRef}
                    type="text"
                    placeholder="🔍 Sök fakturaadress..."
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-[#2D9C4A] focus:border-[#2D9C4A] outline-none"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Gatuadress *</label>
                <input
                  type="text"
                  value={billingStreet}
                  onChange={(e) => setBillingStreet(e.target.value)}
                  className={inputClass('billingStreet')}
                  placeholder="Fakturagatan 1"
                />
                {errors.billingStreet && <p className="text-red-500 text-xs mt-1">{errors.billingStreet}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Postnummer *</label>
                  <input
                    type="text"
                    value={billingPostalCode}
                    onChange={(e) => handleBillingPcChange(e.target.value)}
                    className={inputClass('billingPostalCode')}
                    placeholder="123 45"
                    inputMode="numeric"
                    maxLength={6}
                  />
                  {errors.billingPostalCode && <p className="text-red-500 text-xs mt-1">{errors.billingPostalCode}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Postort *
                    {billingCityLookup && <span className="text-[10px] text-gray-400 font-normal ml-1">söker…</span>}
                    {!billingCityLookup && billingCityAutoFilled && (
                      <span className="text-[10px] text-[#2D9C4A] font-normal ml-1">✓ autofyllt</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={billingCity}
                    onChange={(e) => { setBillingCity(e.target.value); setBillingCityAutoFilled(false); }}
                    className={inputClass('billingCity')}
                    placeholder={billingCityLookup ? 'Söker…' : 'Stockholm'}
                  />
                  {errors.billingCity && <p className="text-red-500 text-xs mt-1">{errors.billingCity}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Övrig info */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Övrig information (frivilligt)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:ring-2 focus:ring-[#2D9C4A] focus:border-[#2D9C4A] outline-none transition-colors"
            placeholder="Portkod, kontaktperson på plats, etc."
          />
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-6 py-3.5 rounded-xl font-semibold text-gray-700 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
          ← Tillbaka
        </button>
        <button
          onClick={handleSubmit}
          className="bg-gradient-to-r from-[#2D9C4A] to-[#1E7A34] text-white px-10 py-3.5 rounded-xl font-bold text-lg hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          Skicka bokning ✓
        </button>
      </div>
    </div>
  );
}
