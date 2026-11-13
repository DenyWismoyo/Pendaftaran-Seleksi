'use client';

import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  FastForward,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react';
import { StepCompletionSummary, WizardStep } from '@/components/seleksi/types';
import { cn } from '@/lib/utils';

interface WizardStepperNavProps {
  steps: WizardStep[];
  stepSummaries: StepCompletionSummary[];
  currentStep: number;
  onStepSelect: (index: number) => void;
  onSkipStep: () => void;
}

export default function WizardStepperNav({
  steps,
  stepSummaries,
  currentStep,
  onStepSelect,
  onSkipStep,
}: WizardStepperNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const activeStep = steps[currentStep];
  const activeSummary = stepSummaries[currentStep];
  const reviewIndex = steps.findIndex((s) => s.type === 'review');
  const completedStepsCount = stepSummaries.filter(
    (s) => s.type !== 'review' && s.isComplete
  ).length;
  const fillableStepsCount = stepSummaries.filter(
    (s) => s.type !== 'review'
  ).length;

  const handleSelect = (idx: number) => {
    onStepSelect(idx);
    setMenuOpen(false);
  };

  return (
    <nav aria-label="Tahapan formulir" className="ui-card-compact p-3.5 sm:p-4 space-y-3">
      {/* Compact Hamburger Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-controls="wizard-step-drawer"
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors shrink-0 cursor-pointer',
              menuOpen
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-zinc-50 text-zinc-800 border-zinc-200 hover:bg-zinc-100'
            )}
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>Daftar Bagian</span>
            <span
              className={cn(
                'font-mono text-[11px] px-1.5 py-0.5 rounded-md',
                menuOpen ? 'bg-white/15 text-white' : 'bg-white border border-zinc-200 text-zinc-700'
              )}
            >
              {currentStep + 1}/{steps.length}
            </span>
            {menuOpen ? (
              <ChevronUp className="w-3.5 h-3.5 opacity-80" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs sm:text-sm font-bold text-zinc-900 truncate">
                {activeStep?.title}
              </p>
              {activeSummary && activeSummary.type !== 'review' && (
                <span
                  className={cn(
                    'text-[11px] font-mono px-2 py-0.5 rounded-md border shrink-0',
                    activeSummary.isComplete
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                      : activeSummary.completedRequiredCount > 0
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                  )}
                >
                  {activeSummary.completedRequiredCount}/{activeSummary.requiredCount} wajib
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 truncate">
              {completedStepsCount}/{fillableStepsCount} bagian wajib selesai • Klik Daftar Bagian untuk lompat bebas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {currentStep < steps.length - 1 && (
            <button
              type="button"
              onClick={onSkipStep}
              title="Lewati bagian ini sementara dan lanjut ke bagian berikutnya"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 cursor-pointer transition-colors"
            >
              <span>Lewati</span>
              <FastForward className="w-3.5 h-3.5" />
            </button>
          )}
          {reviewIndex >= 0 && currentStep !== reviewIndex && (
            <button
              type="button"
              onClick={() => handleSelect(reviewIndex)}
              title="Langsung menuju halaman Verifikasi & Kirim"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tinjau &amp; Kirim</span>
              <span className="sm:hidden">Tinjau</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Quick Step Progress Strip */}
      <div className="flex items-center gap-1.5" role="group" aria-label="Pindah cepat per bagian">
        {steps.map((step, idx) => {
          const summary = stepSummaries[idx];
          const isActive = idx === currentStep;
          const isComplete = Boolean(summary?.isComplete);
          const isPartial =
            !isComplete && (summary?.completedRequiredCount || 0) > 0;

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => handleSelect(idx)}
              title={`Tahap ${idx + 1}: ${step.title}`}
              className={cn(
                'h-2 flex-1 rounded-full transition-all cursor-pointer',
                isActive
                  ? 'bg-zinc-900 ring-2 ring-zinc-900/20'
                  : isComplete
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : isPartial
                      ? 'bg-amber-400 hover:bg-amber-500'
                      : 'bg-zinc-200 hover:bg-zinc-300'
              )}
            />
          );
        })}
      </div>

      {/* Expandable Hamburger Menu Drawer */}
      {menuOpen && (
        <div
          id="wizard-step-drawer"
          className="pt-2 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          {steps.map((step, idx) => {
            const summary = stepSummaries[idx];
            const isActive = idx === currentStep;
            const isComplete = Boolean(summary?.isComplete);
            const isPartial =
              !isComplete && (summary?.completedRequiredCount || 0) > 0;

            return (
              <button
                key={step.key}
                type="button"
                onClick={() => handleSelect(idx)}
                className={cn(
                  'flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer',
                  isActive
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : isComplete
                      ? 'bg-emerald-50/60 text-zinc-900 border-emerald-200 hover:bg-emerald-50'
                      : 'bg-zinc-50/70 text-zinc-800 border-zinc-200 hover:bg-zinc-100/80'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs shrink-0',
                      isActive
                        ? 'bg-white text-zinc-900 font-bold'
                        : isComplete
                          ? 'bg-emerald-600 text-white'
                          : isPartial
                            ? 'bg-amber-200 text-amber-900 font-semibold'
                            : 'bg-zinc-200 text-zinc-600'
                    )}
                  >
                    {isComplete && !isActive ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-snug break-words">
                      {step.title}
                    </p>
                    <p
                      className={cn(
                        'text-[11px]',
                        isActive ? 'text-zinc-300' : 'text-zinc-500'
                      )}
                    >
                      {step.type === 'review'
                        ? isComplete
                          ? 'Siap dikirim'
                          : 'Pemeriksaan akhir'
                        : isComplete
                          ? 'Semua item wajib lengkap'
                          : `${summary?.completedRequiredCount ?? 0} dari ${summary?.requiredCount ?? 0} item wajib terisi`}
                    </p>
                  </div>
                </div>

                <span
                  className={cn(
                    'text-[10px] font-mono px-2 py-0.5 rounded-md shrink-0',
                    isActive
                      ? 'bg-white/15 text-white'
                      : isComplete
                        ? 'bg-emerald-100 text-emerald-800 font-semibold'
                        : isPartial
                          ? 'bg-amber-100 text-amber-900 font-semibold'
                          : 'bg-white border border-zinc-200 text-zinc-500'
                  )}
                >
                  {isActive
                    ? 'Aktif'
                    : isComplete
                      ? 'Lengkap'
                      : isPartial
                        ? 'Sebagian'
                        : 'Buka'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}
