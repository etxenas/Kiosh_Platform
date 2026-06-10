'use client';

import { BookingStep } from '@/lib/types';

interface Props {
  steps: BookingStep[];
  currentStep: BookingStep;
  labels: Record<BookingStep, string>;
}

export default function ProgressBar({ steps, currentStep, labels }: Props) {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isComplete
                    ? 'bg-[#2D9C4A] text-white shadow-lg shadow-[#2D9C4A]/20'
                    : isCurrent
                    ? 'bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/20 animate-pop-in'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isComplete ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs mt-1.5 hidden sm:block font-medium ${
                  isCurrent ? 'text-[#FF6B35]' : isComplete ? 'text-[#2D9C4A]' : 'text-gray-400'
                }`}
              >
                {labels[step]}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 rounded-full transition-colors duration-300 ${
                  i < currentIndex ? 'bg-[#2D9C4A]' : 'bg-gray-100'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
