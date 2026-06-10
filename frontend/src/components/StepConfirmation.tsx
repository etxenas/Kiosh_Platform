'use client';

import { BookingResponse, Hub } from '@/lib/types';
import { EXPRESS_CUTOFF_DAYS } from '@/lib/mock-data';

interface Props {
  bookingResponse: BookingResponse;
  selectedHub: Hub | null;
  onNewBooking: () => void;
}

export default function StepConfirmation({ bookingResponse, selectedHub, onNewBooking }: Props) {
  const isExpress = bookingResponse.isExpress || false;

  return (
    <div className="text-center animate-pop-in">
      {/* Success */}
      <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg ${
        isExpress
          ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-200'
          : 'bg-gradient-to-br from-[#2D9C4A] to-[#1E7A34] shadow-green-200'
      }`}>
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
        {isExpress ? 'Express-bokning mottagen! ⚡' : 'Bokning mottagen! 🎉'}
      </h2>
      <p className="text-gray-500 mb-2">
        {isExpress
          ? `Eftersom din bokning är inom ${EXPRESS_CUTOFF_DAYS} dagar ringer vi upp dig för att bekräfta ordern.`
          : 'Vi har tagit emot din bokning. Du får en bekräftelse via email inom kort.'}
      </p>
      {selectedHub && (
        <p className="text-sm text-green-700 mb-6">
          📍 Levereras från {selectedHub.name} ({selectedHub.distanceKm} km)
        </p>
      )}

      {isExpress && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📞</span>
            <div className="text-left">
              <p className="font-bold text-amber-800">Vi ringer dig!</p>
              <p className="text-amber-700 text-sm mt-0.5">
                Håll koll på telefonen — vi kontaktar dig inom kort för att bekräfta din express-order.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-[#FFFDF7] to-[#F0FDF4] rounded-2xl p-6 mb-8 text-left border border-gray-100">
        <div className="flex justify-between mb-3">
          <span className="text-gray-500">Bokningsnummer</span>
          <span className="font-mono font-bold text-gray-900 bg-white rounded-lg px-3 py-0.5 border border-gray-200">
            {bookingResponse.bookingId}
          </span>
        </div>
        <div className="flex justify-between mb-3">
          <span className="text-gray-500">Status</span>
          <span className={`inline-flex items-center text-sm font-bold rounded-full px-3 py-0.5 ${
            isExpress
              ? 'text-amber-700 bg-amber-100'
              : 'text-green-700 bg-green-100'
          }`}>
            {isExpress ? 'Väntar på bekräftelse' : bookingResponse.status}
          </span>
        </div>

        <hr className="my-4 border-gray-200" />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Toalett</span>
            <span className="text-gray-900 font-semibold">
              {bookingResponse.breakdown.toiletRental.toLocaleString('sv-SE')} kr
            </span>
          </div>
          {bookingResponse.breakdown.addons > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tillval</span>
              <span className="text-gray-900 font-semibold">
                {bookingResponse.breakdown.addons.toLocaleString('sv-SE')} kr
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Utkörning</span>
            <span className="text-gray-900 font-semibold">
              {bookingResponse.breakdown.delivery.toLocaleString('sv-SE')} kr
            </span>
          </div>
          {bookingResponse.breakdown.serviceFee ? (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">🔧 Service {bookingResponse.serviceLevel || ''}</span>
              <span className="text-gray-900 font-semibold">
                +{bookingResponse.breakdown.serviceFee.toLocaleString('sv-SE')} kr
              </span>
            </div>
          ) : null}
          {bookingResponse.breakdown.expressFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-amber-600">Expressavgift ⚡</span>
              <span className="text-amber-700 font-semibold">
                {bookingResponse.breakdown.expressFee.toLocaleString('sv-SE')} kr
              </span>
            </div>
          )}
          <div className="flex justify-between text-lg font-extrabold pt-2 border-t border-gray-200">
            <span>Totalt</span>
            <span className={isExpress ? 'text-amber-600' : 'text-[#FF6B35]'}>
              {bookingResponse.breakdown.total.toLocaleString('sv-SE')} kr
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onNewBooking}
        className="bg-gradient-to-r from-[#FF6B35] to-[#E55A2B] text-white px-8 py-3.5 rounded-xl font-bold text-lg hover:shadow-lg hover:-translate-y-0.5 transition-all"
      >
        Gör en ny bokning
      </button>
    </div>
  );
}
