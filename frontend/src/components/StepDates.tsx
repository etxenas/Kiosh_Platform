'use client';

import { isExpressOrder, EXPRESS_FEE, EXPRESS_CUTOFF_DAYS } from '@/lib/mock-data';

interface Props {
  startDate: string | null;
  endDate: string | null;
  onUpdate: (startDate: string, endDate: string) => void;
  onBack?: () => void;
  onNext: () => void;
}

export default function StepDates({ startDate, endDate, onUpdate, onBack, onNext }: Props) {
  const today = new Date().toISOString().split('T')[0];

  const canContinue = startDate && endDate && new Date(startDate) <= new Date(endDate);
  const days =
    startDate && endDate && new Date(startDate) <= new Date(endDate)
      ? Math.ceil(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;
  const isExpress = startDate ? isExpressOrder(startDate) : false;

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <span className="text-5xl block mb-3">📅</span>
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-1">
          När behöver du toaletten?
        </h2>
        <p className="text-gray-500">Välj datum för din uthyrning</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Från
          </label>
          <input
            type="date"
            min={today}
            value={startDate || ''}
            onChange={(e) => onUpdate(e.target.value, endDate || e.target.value)}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:ring-2 focus:ring-[#2D9C4A] focus:border-[#2D9C4A] outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Till
          </label>
          <input
            type="date"
            min={startDate || today}
            value={endDate || ''}
            onChange={(e) => onUpdate(startDate || e.target.value, e.target.value)}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:ring-2 focus:ring-[#2D9C4A] focus:border-[#2D9C4A] outline-none transition-colors"
          />
        </div>
      </div>

      {/* Express-varning */}
      {isExpress && startDate && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 mb-6 animate-pop-in">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-bold text-amber-800">
                Express-beställning
              </p>
              <p className="text-amber-700 text-sm mt-0.5">
                Din beställning är inom {EXPRESS_CUTOFF_DAYS} dagar. En expressavgift på{' '}
                <strong>{EXPRESS_FEE} kr</strong> tillkommer, och vi kommer att ringa upp dig för
                att bekräfta ordern innan leverans.
              </p>
            </div>
          </div>
        </div>
      )}

      {days && days > 0 && !isExpress && (
        <div className="bg-gradient-to-r from-[#F0FDF4] to-[#ECFDF5] border border-green-200 rounded-xl p-4 mb-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">
                {new Date(startDate!).toLocaleDateString('sv-SE')} —{' '}
                {new Date(endDate!).toLocaleDateString('sv-SE')}
              </p>
              <p className="font-bold text-green-800 text-lg">
                {days} {days === 1 ? 'dag' : 'dagar'}
              </p>
            </div>
            <span className="text-3xl">🗓️</span>
          </div>
        </div>
      )}

      {days && days > 0 && isExpress && (
        <div className="bg-gradient-to-r from-[#FFF8F0] to-[#FFECD0] border border-amber-200 rounded-xl p-4 mb-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700">
                {new Date(startDate!).toLocaleDateString('sv-SE')} —{' '}
                {new Date(endDate!).toLocaleDateString('sv-SE')}
              </p>
              <p className="font-bold text-amber-800 text-lg">
                {days} {days === 1 ? 'dag' : 'dagar'} ⚡ Express
              </p>
            </div>
            <span className="text-3xl">⚡</span>
          </div>
        </div>
      )}

      <div className="flex justify-between gap-3">
        {onBack ? (
          <button
            onClick={onBack}
            className="px-6 py-3.5 rounded-xl font-semibold text-gray-700 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            ← Tillbaka
          </button>
        ) : <span />}
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="bg-gradient-to-r from-[#FF6B35] to-[#E55A2B] text-white px-8 py-3.5 rounded-xl font-bold text-lg hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
        >
          {isExpress ? 'Express-boka →' : 'Välj toalett →'}
        </button>
      </div>
    </div>
  );
}
