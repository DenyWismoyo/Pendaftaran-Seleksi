'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Award, CheckCircle2, Loader2, LogOut, Search } from 'lucide-react';
import { toast } from 'sonner';
import FilePreviewModal from '@/components/FilePreviewModal';
import PanelLoginCard from '@/components/panel/PanelLoginCard';
import PanelScoringForm, {
  PanelistProfile,
} from '@/components/panel/PanelScoringForm';
import { resolveFormStages } from '@/lib/selectionStages';
import { cn } from '@/lib/utils';
import {
  SelectionForm,
  SelectionSubmission,
  UploadedFileMeta,
} from '@/types/selection';

export default function PenilaianWorkspace() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [loading, setLoading] = useState(true);
  const [panelist, setPanelist] = useState<PanelistProfile | null>(null);
  const [forms, setForms] = useState<SelectionForm[]>([]);
  const [submissions, setSubmissions] = useState<SelectionSubmission[]>([]);

  const [selectedFormId, setSelectedFormId] = useState('');
  const [activeStageId, setActiveStageId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [previewFile, setPreviewFile] = useState<UploadedFileMeta | null>(null);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/panel/session');
      if (res.status === 401) {
        setPanelist(null);
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        setPanelist(null);
        return;
      }
      setPanelist(json.data.panelist);
      setForms(json.data.forms || []);
      setSubmissions(json.data.submissions || []);

      if (json.data.forms?.length > 0) {
        const firstForm = json.data.forms[0] as SelectionForm;
        setSelectedFormId((prev) => prev || firstForm.id);
        const stages = resolveFormStages(firstForm);
        const defaultStage =
          stages.find((s) => s.requiresScoring) || stages[0];
        if (defaultStage) {
          setActiveStageId((prev) => prev || defaultStage.id);
        }
      }
    } catch {
      setPanelist(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const activeForm = useMemo(
    () => forms.find((f) => f.id === selectedFormId) || forms[0],
    [forms, selectedFormId]
  );

  const stages = useMemo(() => resolveFormStages(activeForm), [activeForm]);

  const filteredSubs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions.filter((s) => {
      if (activeForm && s.formId !== activeForm.id) return false;
      if (!q) return true;
      return (
        s.applicantName.toLowerCase().includes(q) ||
        s.registrationCode.toLowerCase().includes(q)
      );
    });
  }, [submissions, activeForm, search]);

  const selectedSub = useMemo(
    () => filteredSubs.find((s) => s.id === selectedSubId) || filteredSubs[0],
    [filteredSubs, selectedSubId]
  );

  const handleLogout = async () => {
    await fetch('/api/panel/login', { method: 'DELETE' });
    setPanelist(null);
    toast.success('Sesi Portal Penilai ditutup.');
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
      </div>
    );
  }

  if (!panelist) {
    return (
      <div className="page-container">
        <PanelLoginCard initialCode={initialCode} onSuccess={loadSession} />
      </div>
    );
  }

  return (
    <div className="page-container py-6 space-y-5">
      <div className="ui-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-zinc-900">
              {panelist.name}
            </h1>
            <p className="text-xs text-zinc-500">
              {panelist.roleTitle} • {forms.length} Program Seleksi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="ui-btn-secondary px-3.5 py-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar Portal</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={activeForm?.id || ''}
          onChange={(e) => {
            const nextId = e.target.value;
            setSelectedFormId(nextId);
            const nextForm = forms.find((f) => f.id === nextId);
            const nextStages = resolveFormStages(nextForm);
            const defStage =
              nextStages.find((s) => s.requiresScoring) || nextStages[0];
            if (defStage) setActiveStageId(defStage.id);
          }}
          className="ui-input bg-white text-xs sm:text-sm"
        >
          {forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama kandidat atau kode registrasi..."
            className="ui-input pl-9 text-xs sm:text-sm bg-white"
          />
        </div>
      </div>

      {filteredSubs.length === 0 ? (
        <div className="ui-card-dashed p-10 text-center text-sm text-zinc-500">
          Belum ada kandidat terdaftar pada program seleksi ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-4 space-y-2 max-h-[75vh] overflow-y-auto pr-1">
            {filteredSubs.map((sub) => {
              const scoredByMe = (sub.stageEvaluations || []).some(
                (ev) =>
                  ev.stageId === activeStageId && ev.evaluatorId === panelist.id
              );
              const isSelected = selectedSub?.id === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubId(sub.id)}
                  className={cn(
                    'w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-[11px] font-mono font-bold',
                        isSelected ? 'text-emerald-300' : 'text-emerald-700'
                      )}
                    >
                      {sub.registrationCode}
                    </span>
                    {scoredByMe && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Dinilai</span>
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold mt-1">{sub.applicantName}</p>
                  <p
                    className={cn(
                      'text-xs mt-0.5',
                      isSelected ? 'text-zinc-300' : 'text-zinc-500'
                    )}
                  >
                    {sub.files.length} berkas
                    {typeof sub.averagePanelScore === 'number'
                      ? ` • Rata-rata: ${sub.averagePanelScore}`
                      : ''}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-8">
            {selectedSub && (
              <PanelScoringForm
                submission={selectedSub}
                formDef={activeForm}
                stages={stages}
                activeStageId={activeStageId || stages[0]?.id || ''}
                panelist={panelist}
                onStageChange={setActiveStageId}
                onPreviewFile={setPreviewFile}
                onSaved={(patch) => {
                  setSubmissions((prev) =>
                    prev.map((item) =>
                      item.id === selectedSub.id ? { ...item, ...patch } : item
                    )
                  );
                }}
              />
            )}
          </div>
        </div>
      )}

      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}

