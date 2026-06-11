'use client';

import { SelectedProduct, Addon, Hub, Product } from '@/lib/types';
import { isExpressOrder, EXPRESS_FEE, EXPRESS_CUTOFF_DAYS } from '@/lib/pricing';
import { SERVICE_LEVELS } from '@/lib/api';

interface Props {
  selectedProducts: SelectedProduct[];
  startDate: string;
  endDate: string;
  addons: Addon[];
  selectedHub: Hub | null;
  serviceLevel: string;
  price: {
    toiletRental: number;
    addons: number;
    delivery: number;
    expressFee: number;
    total: number;
    numberOfDays: number;
  };
  isExpress: boolean;
  products: Product[];
  onBack: () => void;
  onNext: () => void;
}

export default function StepReview({
  selectedProducts,
  startDate,
  endDate,
  addons,
  selectedHub,
  serviceLevel,
  price,
  isExpress,
  products,
  onBack,
  onNext,
}: Props) {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-5xl block mb-3">{isExpress ? '⚡' : '💰'}</span>
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-1">
          {isExpress ? 'Express-bokning — prisöversikt' : 'Din prisöversikt'}
        </h2>
        <p className="text-gray-500">Allt klart och tydligt — inga dolda avgifter</p>
      </div>

      {/* Express-varning */}
      {isExpress && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-bold text-amber-800">Express-beställning</p>
              <p className="text-amber-700 text-sm mt-0.5">
                Din bokning är inom {EXPRESS_CUTOFF_DAYS} dagar. Vi ringer upp dig för att bekräfta ordern.{' '}
                En expressavgift på {EXPRESS_FEE} kr tillkommer.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-[#FFFDF7] to-[#F0FDF4] rounded-2xl p-6 mb-6 border border-gray-100">
        <div className="space-y-4">
          {/* Datum */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Period</p>
              <p className="font-semibold text-gray-900">
                {new Date(startDate).toLocaleDateString('sv-SE')} —{' '}
                {new Date(endDate).toLocaleDateString('sv-SE')}
              </p>
            </div>
            <span className={`text-sm font-medium bg-white rounded-full px-3 py-1 border ${isExpress ? 'text-amber-700 border-amber-300' : 'text-gray-500 border-gray-200'}`}>
              {price.numberOfDays} {price.numberOfDays === 1 ? 'dag' : 'dagar'}
              {isExpress && ' ⚡'}
            </span>
          </div>

          <hr className="border-gray-200" />

          {/* Toaletter */}
          <div>
            <p className="text-sm text-gray-500 mb-2">Toaletter</p>
            {selectedProducts.map((sp) => {
              const product = products.find(p => p.id === sp.productId);
              if (!product) return null;
              return (
                <div key={sp.productId} className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">
                    {sp.quantity}× {product.name}
                  </span>
                  <span className="text-gray-700 font-medium">
                    {(product.pricePerDay * sp.quantity * price.numberOfDays).toLocaleString('sv-SE')} kr
                  </span>
                </div>
              );
            })}
            <p className="text-right text-sm font-bold text-gray-900 mt-1">
              {price.toiletRental.toLocaleString('sv-SE')} kr
            </p>
          </div>

          {/* Tillval */}
          {addons.length > 0 && (
            <>
              <hr className="border-gray-200" />
              <div>
                <p className="text-sm text-gray-500 mb-2">Tillval</p>
                {addons.map((addon, i) => {
                  const parentProduct = products.find(p => p.id === addon.parentProductId);
                  const parentName = parentProduct?.name || addon.parentProductId;
                  return (
                    <div key={`${addon.parentProductId}-${addon.productId}-${i}`} className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">
                        {addon.productName} ({parentName})
                        {addon.quantity > 1 && <span className="text-gray-400"> × {addon.quantity}</span>}
                      </span>
                      <span className="text-gray-700 font-medium">
                        {(addon.pricePerDay * addon.quantity * price.numberOfDays).toLocaleString('sv-SE')} kr
                      </span>
                    </div>
                  );
                })}
                <p className="text-right text-sm font-bold text-gray-900 mt-1">
                  {price.addons.toLocaleString('sv-SE')} kr
                </p>
              </div>
            </>
          )}

          {/* Servicenivå */}
          {serviceLevel && serviceLevel !== 'Bas' && (() => {
            const sl = SERVICE_LEVELS.find(l => l.id === serviceLevel);
            if (!sl) return null;
            const serviceFee = Math.round(price.toiletRental * (sl.priceMultiplier - 1));
            return (
              <>
                <hr className="border-gray-200" />
                <div className="flex justify-between">
                  <div>
                    <p className="text-gray-700">{sl.emoji} Service {sl.name}</p>
                    <p className="text-xs text-gray-400">{sl.description}</p>
                  </div>
                  <p className="font-medium text-gray-900">+{serviceFee.toLocaleString('sv-SE')} kr</p>
                </div>
              </>
            );
          })()}

          <hr className="border-gray-200" />

          {/* Utkörning */}
          <div className="flex justify-between">
            <div>
              <p className="text-gray-700">Frakt & leverans</p>
              {selectedHub && (
                <p className="text-xs text-gray-400">
                  Från {selectedHub.name} ({selectedHub.distanceKm} km)
                </p>
              )}
            </div>
            <p className="font-medium text-gray-900">{price.delivery.toLocaleString('sv-SE')} kr</p>
          </div>

          {/* Expressavgift */}
          {price.expressFee > 0 && (
            <div className="flex justify-between">
              <div>
                <p className="text-amber-700">Expressavgift ⚡</p>
                <p className="text-xs text-amber-500">Beställning inom {EXPRESS_CUTOFF_DAYS} dagar</p>
              </div>
              <p className="font-medium text-amber-700">{price.expressFee.toLocaleString('sv-SE')} kr</p>
            </div>
          )}

          {/* Total */}
          <div className={`bg-white rounded-xl p-4 border-2 ${isExpress ? 'border-amber-300' : 'border-[#FF6B35]/20'}`}>
            <div className="flex justify-between items-center">
              <p className="text-lg font-extrabold text-gray-900">Totalt</p>
              <p className={`text-3xl font-extrabold ${isExpress ? 'text-amber-600' : 'text-[#FF6B35]'}`}>
                {price.total.toLocaleString('sv-SE')} kr
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">Inkl. moms</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="text-gray-500 px-4 py-3 rounded-xl hover:text-gray-700 font-medium transition-colors"
        >
          ← Tillbaka
        </button>
        <button
          onClick={onNext}
          className={`px-8 py-3.5 rounded-xl font-bold text-lg hover:shadow-lg hover:-translate-y-0.5 transition-all text-white ${
            isExpress
              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
              : 'bg-gradient-to-r from-[#2D9C4A] to-[#1E7A34]'
          }`}
        >
          {isExpress ? 'Fortsätt (express) →' : 'Fortsätt →'}
        </button>
      </div>
    </div>
  );
}
