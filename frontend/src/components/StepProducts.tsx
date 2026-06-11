'use client';

import { Product, SelectedProduct, Hub } from '@/lib/types';
import { AvailabilityResult, ReachableHub, getAvailableCountFor } from '@/lib/catalog';

interface Props {
  products: Product[];
  selectedProducts: SelectedProduct[];
  selectedHub: Hub | null;
  availability: AvailabilityResult | null;
  reachableHubs: ReachableHub[];
  hubChange: { from: string; to: string; extraFee: number } | null;
  hubUnavailable: boolean;
  onUpdate: (selected: SelectedProduct[]) => void;
  onBack: () => void;
  onNext: () => void;
}

// Mapping baserat på ProductCode (TOA-PRE/STD/HCP/LYX) för att vara robust
// mot SF-IDs som varierar mellan orgs.
const productColors: Record<string, string> = {
  'TOA-PRE': 'from-emerald-500 to-green-600',
  'TOA-STD': 'from-blue-500 to-cyan-600',
  'TOA-HCP': 'from-purple-500 to-indigo-600',
  'TOA-LYX': 'from-amber-500 to-orange-600',
};

const productEmojis: Record<string, string> = {
  'TOA-PRE': '🚽',
  'TOA-STD': '🚻',
  'TOA-HCP': '♿',
  'TOA-LYX': '👑',
};

function getSelected(productId: string, list: SelectedProduct[]): SelectedProduct | undefined {
  return list.find((p) => p.productId === productId);
}

export default function StepProducts({
  products,
  selectedProducts,
  selectedHub,
  availability,
  reachableHubs,
  hubChange,
  hubUnavailable,
  onUpdate,
  onBack,
  onNext,
}: Props) {
  // Tillgänglighet "totalt från någon hub i räckvidd" — används för att visa till-
  // gängliga toaletter även när selectedHub saknar dem (vi kan ju byta hub).
  const totalAvailableForProduct = (productId: string): number => {
    if (!availability) return 99; // ej hämtat än
    let sum = 0;
    for (const h of reachableHubs) {
      sum += availability.availability[h.id]?.[productId] ?? 0;
    }
    return sum;
  };
  const toggleProduct = (productId: string) => {
    const existing = getSelected(productId, selectedProducts);
    if (existing) {
      onUpdate(selectedProducts.filter((p) => p.productId !== productId));
    } else {
      onUpdate([...selectedProducts, { productId, quantity: 1 }]);
    }
  };

  // Maximalt antal av en produkt = högsta tillgängligheten över alla räckvidd-hubs
  // (eftersom vi kan byta hub om nödvändigt; men vi levererar bara från EN hub,
  // så max för en enskild produkt är max per hub).
  const maxQtyFor = (productId: string): number => {
    if (!availability) return 999;
    let max = 0;
    for (const h of reachableHubs) {
      const c = availability.availability[h.id]?.[productId] ?? 0;
      if (c > max) max = c;
    }
    return Math.max(1, max);
  };

  const changeQuantity = (productId: string, delta: number) => {
    onUpdate(
      selectedProducts.map((p) =>
        p.productId === productId
          ? { ...p, quantity: Math.max(1, Math.min(p.quantity + delta, maxQtyFor(productId))) }
          : p
      )
    );
  };

  const totalToilets = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-5xl block mb-3">🚽</span>
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-1">
          Välj toaletter
        </h2>
        <p className="text-gray-500">
          Du kan välja flera modeller — perfekt för större evenemang!
        </p>
        {selectedHub && !hubUnavailable && (
          <p className="text-sm text-green-700 mt-2 bg-green-100 inline-block rounded-full px-4 py-1">
            📍 Levereras från {selectedHub.name} ({selectedHub.distanceKm} km) — {selectedHub.deliveryFee} kr
          </p>
        )}
      </div>

      {/* Banner: hub-byte krävs */}
      {hubChange && !hubUnavailable && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-5 animate-pop-in">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📦</span>
            <div className="flex-1">
              <p className="font-bold text-amber-900 text-sm">Vi byter depot åt dig</p>
              <p className="text-xs text-amber-800 mt-1">
                På grund av dina val levererar vi nu från <strong>{hubChange.to}</strong>
                {hubChange.extraFee > 0 ? (
                  <> istället för {hubChange.from} — leveranskostnaden blir <strong>{hubChange.extraFee} kr högre</strong>.</>
                ) : (
                  <> (samma leveranskostnad).</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner: ingen enda hub kan tillgodose allt */}
      {hubUnavailable && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-5 animate-pop-in">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✉️</span>
            <div className="flex-1">
              <p className="font-bold text-red-900 text-sm">Vi kan inte leverera allt från en enda depot</p>
              <p className="text-xs text-red-800 mt-1">
                Tyvärr har vi inte alla dina val tillgängliga på en och samma depot under perioden.
                Vi levererar bara från en depot per bokning — kontakta oss på <a href="mailto:info@kiosh.se" className="font-semibold underline">info@kiosh.se</a> så ordnar vi det manuellt.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 mb-6 stagger">
        {products.map((product) => {
          // Använd total över alla räckvidd-hubs eftersom vi kan auto-byta hub.
          const totalAvail = totalAvailableForProduct(product.id);
          const inSelectedHub = selectedHub ? getAvailableCountFor(availability, selectedHub.id, product.id) : null;
          const available = totalAvail;
          const knownAvailable = availability !== null;
          // Markera om denna produkt skulle kräva hub-byte (finns på annan hub men inte vald)
          const requiresHubChange = selectedHub && availability && (inSelectedHub ?? 0) === 0 && totalAvail > 0;
          const selected = getSelected(product.id, selectedProducts);
          const isChecked = !!selected;
          const color = productColors[product.productCode] || 'from-gray-500 to-gray-600';
          const emoji = productEmojis[product.productCode] || '🚽';

          return (
            <div
              key={product.id}
              className={`rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                isChecked
                  ? 'border-[#2D9C4A] bg-green-50/30 shadow-sm'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              } ${available === 0 ? 'opacity-40' : ''}`}
            >
              <div className="flex">
                {/* Färgad sidopanel */}
                <div
                  className={`bg-gradient-to-b ${color} p-4 flex items-center justify-center min-w-[80px] cursor-pointer`}
                  onClick={() => available > 0 && toggleProduct(product.id)}
                >
                  <span className="text-3xl">{emoji}</span>
                </div>

                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        onClick={() => available > 0 && toggleProduct(product.id)}
                        className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0 ${
                          isChecked
                            ? 'bg-[#2D9C4A] border-[#2D9C4A]'
                            : 'border-gray-300 hover:border-[#2D9C4A]'
                        }`}
                      >
                        {isChecked && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
                        <p className="text-gray-500 text-sm mt-0.5">{product.description}</p>
                        {available > 0 ? (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-100 rounded-full px-2.5 py-0.5">
                              {knownAvailable ? `${available} st tillgängliga` : 'Tillgänglig'}
                            </span>
                            {requiresHubChange && (
                              <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2.5 py-0.5">
                                📦 kräver byte av depot
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium text-red-600 bg-red-100 rounded-full px-2.5 py-0.5 mt-1.5">
                            Fullbokad
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="text-2xl font-extrabold text-[#FF6B35]">
                        {product.pricePerDay} kr
                      </p>
                      <p className="text-sm text-gray-400">per dag</p>
                    </div>
                  </div>

                  {/* Kvantitet — visas när vald */}
                  {isChecked && available > 1 && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 animate-pop-in">
                      <span className="text-sm text-gray-500">Antal:</span>
                      <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
                        <button
                          onClick={() => changeQuantity(product.id, -1)}
                          disabled={selected!.quantity <= 1}
                          className="w-8 h-8 rounded-md flex items-center justify-center text-lg font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-bold text-gray-900">
                          {selected!.quantity}
                        </span>
                        <button
                          onClick={() => changeQuantity(product.id, 1)}
                          disabled={selected!.quantity >= available}
                          className="w-8 h-8 rounded-md flex items-center justify-center text-lg font-bold text-[#2D9C4A] hover:bg-green-50 disabled:opacity-30 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summering — visas när minst en produkt är vald */}
      {selectedProducts.length > 0 && (
        <div className="bg-gradient-to-r from-[#F0FDF4] to-[#ECFDF5] rounded-2xl p-4 mb-6 border border-green-200 animate-fade-in">
          <p className="font-bold text-gray-900 mb-1">Valda toaletter:</p>
          {selectedProducts.map((sp) => {
            const p = products.find((pr) => pr.id === sp.productId);
            return p ? (
              <p key={sp.productId} className="text-sm text-gray-700">
                {sp.quantity}× {p.name} ({sp.quantity * p.pricePerDay} kr/dag)
              </p>
            ) : null;
          })}
          <p className="text-sm font-bold text-gray-900 mt-2 pt-2 border-t border-green-200">
            Totalt: {totalToilets} {totalToilets === 1 ? 'toalett' : 'toaletter'}
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="text-gray-500 px-4 py-3 rounded-xl hover:text-gray-700 font-medium transition-colors"
        >
          ← Tillbaka
        </button>
        <button
          onClick={onNext}
          disabled={selectedProducts.length === 0 || hubUnavailable}
          className="bg-gradient-to-r from-[#FF6B35] to-[#E55A2B] text-white px-8 py-3.5 rounded-xl font-bold text-lg hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
        >
          Tillval →
        </button>
      </div>
    </div>
  );
}
