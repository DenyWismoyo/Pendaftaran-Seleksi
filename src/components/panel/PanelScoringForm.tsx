'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  computeWeightedStageScore,
  resolveStageCriteria,
} from '@/lib/selectionStages';
import { formatBytes, formatDateID } from '@/lib/utils';
import {
  PanelPermissions,
  SelectionForm,
  SelectionStage,
  SelectionSubmission,
  StageEvaluation,
  StageRecommendation,
  UploadedFileMeta,
} from '@/types/selection';

export interface PanelistProfile {
  id: string;
  name: string;
  roleTitle: string;
  email: string;
  formIds: string[];
  isAllForms: boolean;
  allowedStageIds: string[];
  permissions: PanelPermissions;
}

interface PanelScoringFormProps {
  submission: SelectionSubmission;
  formDef?: SelectionForm;
  stages: SelectionStage[];
  activeStageId: string;
  panelist: PanelistProfile;
  onStageChange: (stageId: string) => void;
  onPreviewFile: (file: UploadedFileMeta) => void;
  onSaved: (updated: Partial<SelectionSubmission>) => void;
}

export default function PanelScoringForm({
  submission,
  formDef,
  stages,
  activeStageId,
  panelist,
  onStageChange,
  onPreviewFile,
  onSaved,
}: PanelScoringFormProps) {
  const criteria = useMemo(
    () => resolveStageCriteria(formDef, activeStageId),
    [formDef, activeStageId]
  );

  const existingEval = useMemo(
    () =>
      (submission.stageEvaluations || []).find(
        (ev) => ev.stageId === activeStageId && ev.evaluatorId === panelist.id
      ),
    [submission.stageEvaluations, activeStageId, panelist.id]
  );

  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>(
    {}
  );
  const [recommendation, setRecommendation] =
    useState<StageRecommendation>('LAYAK_LANJUT');
  const [note, setNote] = useState('');
  const [advanceToStageId, setAdvanceToStageId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initial: Record<string, number> = {};
    for (const c of criteria) {
      initial[c.id] = existingEval?.criteriaScores?.[c.id] ?? 75;
    }
    setCriteriaScores(initial);
    setRecommendation(existingEval?.recommendation || 'LAYAK_LANJUT');
    setNote(existingEval?.note || '');
    setAdvanceToStageId('');
  }, [submission.id, activeStageId, criteria, existingEval]);

  const weightedTotal = useMemo(
    () => computeWeightedStageScore(criteria, criteriaScores),
    [criteria, criteriaScores]
  );

  const isStageAllowed =
    panelist.allowedStageIds.length === 0 ||
    panelist.allowedStageIds.includes(activeStageId);

  const canScoreNow = Boolean(panelist.permissions?.canScore) && isStageAllowed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canScoreNow) return;

    setSaving(true);
    try {
      const res = await fetch('/api/panel/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          stageId: activeStageId,
          criteriaScores,
          recommendation,
          note,
          advanceToStageId: advanceToStageId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan penilaian.');
      }

      onSaved({
        stageEvaluations: json.data.stageEvaluations,
        panelScores: json.data.panelScores,
        averagePanelScore: json.data.averagePanelScore,
        currentStageId: json.data.currentStageId,
        stageHistory: json.data.stageHistory,
        status: json.data.status,
      });
      toast.success(
        `Nilai ${submission.applicantName} (${weightedTotal}/100) tersimpan.`
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Gagal menyimpan penilaian.'
      );
    } finally {
      setSaving(false);
    }
  };

  const otherEvals: StageEvaluation[] = (
    submission.stageEvaluations || []
  ).filter((ev) => !(ev.stageId === activeStageId && ev.evaluatorId === panelist.id));

  return (
    <div className="ui-card p-5 sm:p-6 space-y-5">
      {/* Header Pelamar */}
      <div className="border-b border-zinc-100 pb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-mono font-bold text-emerald-700">
            {submission.registrationCode}
          </span>
          <h2 className="text-xl font-bold text-zinc-900">
            {submission.applicantName}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {submission.formTitle} • {submission.applicantEmail} •{' '}
            {formatDateID(submission.createdAt)}
          </p>
        </div>

        {typeof submission.averagePanelScore === 'number' && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Rata-Rata Panel
            </p>
            <p className="text-base font-extrabold text-emerald-900">
              {submission.averagePanelScore} / 100
            </p>
          </div>
        )}
      </div>

      {/* Pilihan Tahap yang Dinilai */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block">
          Tahap Seleksi yang Dinilai
        </label>
        <div className="flex flex-wrap gap-1.5">
          {stages.map((st) => {
            const allowed =
              panelist.allowedStageIds.length === 0 ||
              panelist.allowedStageIds.includes(st.id);
            const active = st.id === activeStageId;
            const hasMyScore = (submission.stageEvaluations || []).some(
              (ev) => ev.stageId === st.id && ev.evaluatorId === panelist.id
            );
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onStageChange(st.id)}
                className={
                  active
                    ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 text-white inline-flex items-center gap-1.5 cursor-pointer'
                    : 'px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 inline-flex items-center gap-1.5 cursor-pointer'
                }
              >
                {!allowed && <Lock className="w-3 h-3 text-zinc-400" />}
                {hasMyScore && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                <span>
                  {st.order}. {st.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ringkasan Jawaban Formulir */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
          Isian Formulir Kandidat
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
          {Object.entries(submission.answers || {}).map(([key, val]) => {
            const fieldLabel =
              formDef?.fields.find((f) => f.id === key)?.label || key;
            const displayVal = Array.isArray(val) ? val.join(', ') : String(val ?? '-');
            return (
              <div
                key={key}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5"
              >
                <p className="text-[11px] font-semibold text-zinc-500">
                  {fieldLabel}
                </p>
                <p className="text-xs text-zinc-900 mt-0.5 whitespace-pre-wrap break-words">
                  {displayVal || '-'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Berkas Lampiran */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
          Berkas Terunggah ({submission.files.length})
        </h3>
        {panelist.permissions?.canViewFiles === false ? (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Akses pratinjau berkas dinonaktifkan untuk peran penilai ini.
          </p>
        ) : submission.files.length === 0 ? (
          <p className="text-xs text-zinc-400">Tidak ada berkas terunggah.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {submission.files.map((file, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onPreviewFile(file)}
                className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-left hover:bg-zinc-100 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-zinc-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 truncate">
                      {file.fieldLabel}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate">
                      {file.fileName} • {formatBytes(file.size)}
                    </p>
                  </div>
                </div>
                <Eye className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Form Penilaian Panitia */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-zinc-200 pt-4 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-700" />
            <span>Lembar Penilaian Anda ({panelist.name})</span>
          </h3>
          <span className="px-3 py-1 rounded-full bg-zinc-900 text-white text-xs font-extrabold">
            Skor Terbobot: {weightedTotal} / 100
          </span>
        </div>

        {!canScoreNow ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            {panelist.permissions?.canScore === false
              ? 'Kode akses ini hanya memiliki hak lihat (read-only).'
              : 'Tahapan ini tidak termasuk dalam lingkup penugasan Anda.'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {criteria.map((c) => {
                const val = criteriaScores[c.id] ?? 0;
                return (
                  <div
                    key={c.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-semibold text-zinc-800">
                        {c.label}
                      </label>
                      <span className="text-[11px] font-bold text-emerald-700 shrink-0">
                        Bobot {c.weight}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={c.maxScore || 100}
                        value={val}
                        onChange={(e) =>
                          setCriteriaScores((prev) => ({
                            ...prev,
                            [c.id]: Number(e.target.value),
                          }))
                        }
                        className="flex-1 accent-emerald-700"
                      />
                      <input
                        type="number"
                        min={0}
                        max={c.maxScore || 100}
                        value={val}
                        onChange={(e) =>
                          setCriteriaScores((prev) => ({
                            ...prev,
                            [c.id]: Number(e.target.value),
                          }))
                        }
                        className="w-16 ui-input py-1 px-2 text-xs text-center font-bold bg-white"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 block">
                  Rekomendasi Tahap
                </label>
                <select
                  value={recommendation}
                  onChange={(e) =>
                    setRecommendation(e.target.value as StageRecommendation)
                  }
                  className="ui-input bg-white text-xs sm:text-sm"
                >
                  <option value="LAYAK_LANJUT">Layak Lanjut Tahap Berikutnya</option>
                  <option value="CADANGAN">Pertimbangan / Cadangan</option>
                  <option value="TIDAK_LAYAK">Belum Memenuhi Syarat</option>
                </select>
              </div>

              {panelist.permissions?.canAdvanceStage && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 block">
                    Pindahkan Tahap Kandidat (Opsional)
                  </label>
                  <select
                    value={advanceToStageId}
                    onChange={(e) => setAdvanceToStageId(e.target.value)}
                    className="ui-input bg-white text-xs sm:text-sm"
                  >
                    <option value="">Tetap di tahap saat ini</option>
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>
                        Pindahkan ke: {st.order}. {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan penilai, kelebihan kandidat, atau pertanyaan klarifikasi..."
              className="ui-input text-xs sm:text-sm"
            />

            <button
              type="submit"
              disabled={saving}
              className="ui-btn-accent px-5 py-2.5 text-sm"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {existingEval ? 'Perbarui Nilai Tahap Ini' : 'Simpan Nilai Tahap Ini'}
              </span>
            </button>
          </>
        )}
      </form>

      {/* Rekap Penilai Lain */}
      {otherEvals.length > 0 && (
        <div className="border-t border-zinc-100 pt-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Catatan Penilai Lainnya ({otherEvals.length})
          </p>
          <div className="space-y-1.5">
            {otherEvals.map((ev, i) => (
              <div
                key={`${ev.stageId}-${ev.evaluatorId}-${i}`}
                className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold text-zinc-900">
                    {ev.evaluatorName}
                  </span>{' '}
                  <span className="text-zinc-500">({ev.stageName})</span>
                  {ev.note && (
                    <p className="text-[11px] text-zinc-600 mt-0.5">{ev.note}</p>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0">
                  {ev.totalScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

