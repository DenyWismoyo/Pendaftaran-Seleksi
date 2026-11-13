'use client';

import { Check } from 'lucide-react';
import { WizardStep } from '@/components/seleksi/types';
import { cn } from '@/lib/utils';

interface WizardStepperNavProps {
  steps: WizardStep[];
  currentStep: number;
  onStepSelect: (index: number) => void;
}

export default function WizardStepperNav({
  steps,
  currentStep,
  onStepSelect,
}: WizardStepperNavProps) {
  return (
    <nav
      aria-label="Tahapan formulir"
      className="ui-card-compact p-3 sm:p-4 overflow-x-auto no-scrollbar"
    >
      <ol className="flex items-center gap-2 min-w-max">
        {steps.map((step, idx) => {
          const isDone = idx < currentStep;
          const isActive = idx === currentStep;
          return (
            <li key={step.key} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (idx <= currentStep) onStepSelect(idx);
                }}
                disabled={idx > currentStep}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                  isActive
                    ? 'bg-zinc-900 text-white'
                    : isDone
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-pointer hover:bg-emerald-100'
                      : 'bg-zinc-50 text-zinc-400 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px]',
                    isActive
                      ? 'bg-white text-zinc-900'
                      : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-200 text-zinc-500'
                  )}
                >
                  {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                </span>
                <span>{step.title}</span>
              </button>
              {idx < steps.length - 1 && <div className="w-4 h-px bg-zinc-200" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

