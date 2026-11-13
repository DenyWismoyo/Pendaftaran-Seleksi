'use client';

import {
  ArrowDown,
  ArrowUp,
  Award,
  GitBranch,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_SCORING_CRITERIA,
  STAGE_PRESETS,
} from '@/lib/selectionStages';
import { SelectionStage, StageCriterion } from '@/types/selection';
import { slugify } from '@/lib/utils';

interface StagesBuilderSectionProps {
  stages: SelectionStage[];
  scoringCriteria: StageCriterion[];
  onChangeStages: (next: SelectionStage[]) => void;
  onChangeCriteria: (next: StageCriterion[]) => void;
}

export default function StagesBuilderSection({
  stages,
  scoringCriteria,
  onChangeStages,
  onChangeCriteria,
}: StagesBuilderSectionProps) {
  const totalWeight = scoringCriteria.reduce(
    (sum, c) => sum + (Number(c.weight) || 0),
    0
  );

  const normalizeOrders = (items: SelectionStage[]): SelectionStage[] =>
    items.map((st, idx) => ({ ...st, order: idx + 1 }));

  const applyPreset = (key: 'rekrutmen' | 'jabatan' | 'vokasi') => {
    onChangeStages(
      STAGE_PRESETS[key].stages.map((s) => ({ ...s }))
    );
  };

  const addStage = () => {
    const idx = stages.length + 1;
    const next: SelectionStage[] = normalizeOrders([
      ...stages,
      {
        id: `tahap_${idx}_${Date.now().toString(36).slice(-4)}`,
        order: idx,
        name: `Tahap Seleksi ${idx}`,
        description: '',
        requiresScoring: true,
        isFinalStage: false,
      },
    ]);
    onChangeStages(next);
  };

  const updateStage = (idx: number, patch: Partial<SelectionStage>) => {
    const next = stages.map((st, i) => (i === idx ? { ...st, ...patch } : st));
    onChangeStages(normalizeOrders(next));
  };

  const moveStage = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= stages.length) return;
    const next = [...stages];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChangeStages(normalizeOrders(next));
  };

  const removeStage = (idx: number) => {
    if (stages.length <= 1) return;
    onChangeStages(normalizeOrders(stages.filter((_, i) => i !== idx)));
  };

  const addCriterion = () => {
    const idx = scoringCriteria.length + 1;
    onChangeCriteria([
      ...scoringCriteria,
      {
        id: slugify(`kriteria_${idx}`) || `kriteria_${Date.now().toString(36)}`,
        label: `Kriteria Penilaian ${idx}`,
        weight: 20,
        maxScore: 100,
      },
    ]);
  };

  const updateCriterion = (idx: number, patch: Partial<StageCriterion>) => {
    onChangeCriteria(
      scoringCriteria.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    );
  };

  const removeCriterion = (idx: number) => {
    if (scoringCriteria.length <= 1) return;
    onChangeCriteria(scoringCriteria.filter((_, i) => i !== idx));
  };

  return (
    <section className="ui-card p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-700" />
            <span>Tahapan Seleksi &amp; Rubrik Penilaian Panitia</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Atur alur tahapan yang dilalui peserta serta indikator nilai yang diisi panitia di Portal Penilai.
          </p>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Terapkan Pola Tahapan Cepat:</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(Object.keys(STAGE_PRESETS) as Array<'rekrutmen' | 'jabatan' | 'vokasi'>).map(
            (key) => {
              const preset = STAGE_PRESETS[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className="text-left p-3 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-emerald-50 hover:border-emerald-300 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-bold text-zinc-900">{preset.label}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                    {preset.description}
                  </p>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Ordered Stages */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
            Urutan Tahapan ({stages.length})
          </h3>
          <button
            type="button"
            onClick={addStage}
            className="ui-btn-secondary px-3 py-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Tahap</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {stages.map((stage, idx) => (
            <div
              key={stage.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold inline-flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    ID: {stage.id}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveStage(idx, -1)}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
                    title="Geser naik"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStage(idx, 1)}
                    disabled={idx === stages.length - 1}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
                    title="Geser turun"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStage(idx)}
                    disabled={stages.length <= 1}
                    className="p-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-30 cursor-pointer"
                    title="Hapus tahap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={stage.name}
                  onChange={(e) => updateStage(idx, { name: e.target.value })}
                  placeholder="Nama tahapan seleksi"
                  className="ui-input text-xs sm:text-sm bg-white"
                />
                <input
                  type="text"
                  value={stage.description || ''}
                  onChange={(e) =>
                    updateStage(idx, { description: e.target.value })
                  }
                  placeholder="Deskripsi singkat untuk pelamar & panitia"
                  className="ui-input text-xs sm:text-sm bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-0.5">
                <label className="inline-flex items-center gap-1.5 text-xs text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(stage.requiresScoring)}
                    onChange={(e) =>
                      updateStage(idx, { requiresScoring: e.target.checked })
                    }
                    className="rounded accent-emerald-700"
                  />
                  <span>Panitia memberi skor pada tahap ini</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(stage.isFinalStage)}
                    onChange={(e) =>
                      updateStage(idx, { isFinalStage: e.target.checked })
                    }
                    className="rounded accent-zinc-900"
                  />
                  <span>Tahap Penetapan Akhir</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scoring Criteria */}
      <div className="border-t border-zinc-100 pt-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-700" />
              <span>Komponen Indikator Nilai Panitia ({scoringCriteria.length})</span>
            </h3>
            <p className="text-[11px] text-zinc-500">
              Total bobot saat ini: <strong>{totalWeight}%</strong>{' '}
              {totalWeight !== 100 && '(disarankan tepat 100%, sistem tetap menghitung rata-rata berbobot otomatis)'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeCriteria(DEFAULT_SCORING_CRITERIA)}
              className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 underline cursor-pointer"
            >
              Reset Standar
            </button>
            <button
              type="button"
              onClick={addCriterion}
              className="ui-btn-secondary px-3 py-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kriteria</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {scoringCriteria.map((criterion, idx) => (
            <div
              key={criterion.id + idx}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-zinc-50 border border-zinc-200 rounded-xl p-2.5"
            >
              <div className="sm:col-span-6">
                <input
                  type="text"
                  value={criterion.label}
                  onChange={(e) =>
                    updateCriterion(idx, { label: e.target.value })
                  }
                  placeholder="Nama indikator penilaian"
                  className="ui-input text-xs bg-white py-1.5"
                />
              </div>
              <div className="sm:col-span-3 flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-500 shrink-0">Bobot %</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={criterion.weight}
                  onChange={(e) =>
                    updateCriterion(idx, {
                      weight: Number(e.target.value) || 0,
                    })
                  }
                  className="ui-input text-xs bg-white py-1.5"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-500 shrink-0">Maks</span>
                <input
                  type="number"
                  min={10}
                  max={1000}
                  value={criterion.maxScore}
                  onChange={(e) =>
                    updateCriterion(idx, {
                      maxScore: Number(e.target.value) || 100,
                    })
                  }
                  className="ui-input text-xs bg-white py-1.5"
                />
              </div>
              <div className="sm:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeCriterion(idx)}
                  disabled={scoringCriteria.length <= 1}
                  className="p-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-30 cursor-pointer"
                  title="Hapus kriteria"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

