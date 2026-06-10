'use client';

import { SERVICE_LEVELS, ServiceLevel } from '@/lib/api';

interface Props {
  serviceLevel: string;
  days: number;
  basePrice: number;
  onUpdate: (serviceLevel: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function StepServiceLevel({ serviceLevel, days, basePrice, onUpdate, onBack, onNext }: Props) {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-5xl block mb-3">🔧</span>
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-1">
          Välj servicenivå
        </h2>
        <p className="text-gray-500">
          {days <= 1
            ? 'Kort hyra — Bas räcker ofta'
            : `${days} dagar — vi rekommenderar Standard eller Premium`}
        </p>
      </div>

      <div className="space-y-4">
        {SERVICE_LEVELS.map((level) => {
          const isSelected = serviceLevel === level.id;
          const levelPrice = Math.round(basePrice * (level.priceMultiplier - 1));
          const totalForLevel = Math.round(basePrice * level.priceMultiplier);

          // Don't show Premium for 1-day rentals
          if (level.id === 'Premium' && days <= 1) return null;

          return (
            <button
              key={level.id}
              onClick={() => onUpdate(level.id)}
              className={`w-full text-left rounded-2xl p-5 border-2 transition-all ${
                isSelected
                  ? 'border-[#2D9C4A] bg-green-50/50 shadow-md'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{level.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-lg text-gray-900">{level.name}</h3>
                    <div className="text-right">
                      {level.priceMultiplier > 1 ? (
                        <>
                          <span className="text-[#FF6B35] font-bold text-lg">+{levelPrice} kr</span>
                          <span className="text-gray-400 text-xs block">totalt {totalForLevel} kr</span>
                        </>
                      ) : (
                        <span className="text-gray-500 font-medium">Ingen extra kostnad</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{level.description}</p>
                  {level.intervalHours > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                        🕐 Service var {level.intervalHours}h
                      </span>
                      {level.includesCleaning && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                          🧹 Full städning
                        </span>
                      )}
                      {level.includesWaterRefill && (
                        <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-1 rounded-full">
                          💧 Vattenpåfyllning
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'border-[#2D9C4A] bg-[#2D9C4A]' : 'border-gray-300'
                }`}>
                  {isSelected && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {serviceLevel === 'Bas' && days > 2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
          <p className="text-amber-700 text-sm">
            ⚠️ För hyror längre än 2 dagar rekommenderar vi Standard eller Premium för regelbunden tömning och städning.
          </p>
        </div>
      )}

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-100 text-gray-700 px-6 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all"
        >
          ← Tillbaka
        </button>
        <button
          onClick={onNext}
          disabled={!serviceLevel}
          className="flex-1 bg-gradient-to-r from-[#FF6B35] to-[#E55A2B] text-white px-6 py-4 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
        >
          Fortsätt →
        </button>
      </div>
    </div>
  );
}