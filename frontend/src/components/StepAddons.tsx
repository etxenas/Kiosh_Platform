'use client';

import { Product, SelectedProduct, Addon } from '@/lib/types';
import { getProduct } from '@/lib/mock-data';

interface Props {
  addonProducts: Product[];
  selectedToilets: SelectedProduct[];
  selectedAddons: Addon[];
  onUpdate: (addons: Addon[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function StepAddons({
  addonProducts,
  selectedToilets,
  selectedAddons,
  onUpdate,
  onBack,
  onNext,
}: Props) {
  const toggleAddon = (product: Product, parentProductId: string) => {
    const existing = selectedAddons.find(
      (a) => a.productId === product.id && a.parentProductId === parentProductId
    );
    if (existing) {
      onUpdate(selectedAddons.filter((a) => !(a.productId === product.id && a.parentProductId === parentProductId)));
    } else {
      onUpdate([
        ...selectedAddons,
        {
          productId: product.id,
          productName: product.name,
          parentProductId,
          quantity: 1,
          pricePerDay: product.pricePerDay,
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, parentProductId: string, quantity: number) => {
    if (quantity <= 0) {
      onUpdate(selectedAddons.filter(
        (a) => !(a.productId === productId && a.parentProductId === parentProductId)
      ));
      return;
    }
    onUpdate(
      selectedAddons.map((a) =>
        a.productId === productId && a.parentProductId === parentProductId
          ? { ...a, quantity }
          : a
      )
    );
  };

  const getSelected = (productId: string, parentProductId: string) =>
    selectedAddons.find((a) => a.productId === productId && a.parentProductId === parentProductId);

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-5xl block mb-3">🎁</span>
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-1">
          Välj tillval
        </h2>
        <p className="text-gray-500">Tillvalen läggs per toalettmodell</p>
      </div>

      {/* Tillval per modell */}
      {selectedToilets.map((st) => {
        const toiletProduct = getProduct(st.productId);
        const toiletName = toiletProduct?.name || st.productId;
        return (
          <div key={st.productId} className="mb-6">
            <h3 className="font-bold text-gray-800 mb-3 bg-gray-100 rounded-xl px-4 py-2 text-sm">
              {st.quantity}× {toiletName}
            </h3>

            <div className="space-y-2 stagger">
              {addonProducts.map((product) => {
                const selected = getSelected(product.id, st.productId);
                const isChecked = !!selected;

                return (
                  <div
                    key={`${st.productId}-${product.id}`}
                    className={`rounded-2xl border-2 transition-all duration-300 ${
                      isChecked
                        ? 'border-[#2D9C4A] bg-green-50/30'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          onClick={() => toggleAddon(product, st.productId)}
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
                          <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.description}</p>
                          <p className="text-sm font-bold text-[#FF6B35] mt-0.5">
                            {product.pricePerDay} kr/dag
                          </p>
                        </div>
                      </div>

                      {isChecked && (
                        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5 animate-pop-in flex-shrink-0">
                          <button
                            onClick={() => updateQuantity(product.id, st.productId, selected.quantity - 1)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-bold text-gray-900 text-sm">
                            {selected.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, st.productId, selected.quantity + 1)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold text-[#2D9C4A] hover:bg-green-50 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="text-gray-500 px-4 py-3 rounded-xl hover:text-gray-700 font-medium transition-colors"
        >
          ← Tillbaka
        </button>
        <button
          onClick={onNext}
          className="bg-gradient-to-r from-[#FF6B35] to-[#E55A2B] text-white px-8 py-3.5 rounded-xl font-bold text-lg hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          Prisöversikt →
        </button>
      </div>
    </div>
  );
}
