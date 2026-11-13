'use client';

import { useState } from 'react';
import { Award, Loader2 } from 'lucide-react';
import { PanelScore, PanelScoreInput } from '@/types/selection';

interface PanelRubricCardProps {
  panelScores: PanelScore[];
  averagePanelScore?: number;
  savingScore: boolean;
  onSaveScore: (input: PanelScoreInput) => Promise<void>;
}

export default function PanelRubricCard({
  panelScores,
  averagePanelScore,
  savingScore,
  onSaveScore,
}: PanelRubricCardProps) {
  const [adminScore, setAdminScore] = useState(80);
  const [trackRecordScore, setTrackRecordScore] = useState(80);
  const [conceptScore, setConceptScore] = useState(80);
  const [interviewScore, setInterviewScore] = useState(80);
  const [note, setNote] = useState('');

  const previewTotal =
    Math.round(
      ((adminScore + trackRecordScore + conceptScore + interviewScore) / 4) * 100
    ) / 100;

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-700" />
          <h3 className="ui-eyebrow">Rubrik Penilaian Tim Seleksi</h3>
        </div>
        {averagePanelScore !== undefined && (
          <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg">
            Rata-rata Panel: {averagePanelScore}/100 ({panelScores.length} penilai)
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-zinc-700 block">Administrasi</span>
          <input
            type="number"
            min={0}
            max={100}
            value={adminScore}
            onChange={(e) => setAdminScore(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            className="ui-input py-1.5 text-xs font-mono"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-zinc-700 block">Rekam Jejak</span>
          <input
            type="number"
            min={0}
            max={100}
            value={trackRecordScore}
            onChange={(e) =>
              setTrackRecordScore(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
            }
            className="ui-input py-1.5 text-xs font-mono"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-zinc-700 block">Uji Gagasan</span>
          <input
            type="number"
            min={0}
            max={100}
            value={conceptScore}
            onChange={(e) =>
              setConceptScore(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
            }
            className="ui-input py-1.5 text-xs font-mono"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-semibold text-zinc-700 block">Wawancara</span>
          <input
            type="number"
            min={0}
            max={100}
            value={interviewScore}
            onChange={(e) =>
              setInterviewScore(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
            }
            className="ui-input py-1.5 text-xs font-mono"
          />
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan penilai (opsional, mis. kuat di pengalaman industri)"
          className="ui-input py-2 text-xs flex-1"
        />
        <button
          type="button"
          disabled={savingScore}
          onClick={() =>
            onSaveScore({
              adminScore,
              trackRecordScore,
              conceptScore,
              interviewScore,
              note,
            })
          }
          className="ui-btn-primary text-xs shrink-0"
        >
          {savingScore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Simpan Skor ({previewTotal})</span>
        </button>
      </div>

      {panelScores.length > 0 && (
        <div className="divide-y divide-zinc-200/80 rounded-xl border border-zinc-200 bg-white">
          {panelScores.map((ps) => (
            <div
              key={ps.evaluatorEmail}
              className="p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 truncate">
                  {ps.evaluatorName || ps.evaluatorEmail}
                </p>
                {ps.note && <p className="text-[11px] text-zinc-500">{ps.note}</p>}
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-600">
                <span>Adm:{ps.adminScore}</span>
                <span>RJ:{ps.trackRecordScore}</span>
                <span>Ggs:{ps.conceptScore}</span>
                <span>Wwc:{ps.interviewScore}</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {ps.totalScore}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

