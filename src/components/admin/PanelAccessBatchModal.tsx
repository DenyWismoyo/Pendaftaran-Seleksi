'use client';

import { useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminClient';
import { resolveFormStages } from '@/lib/selectionStages';
import {
  PanelAccessPublicView,
  SelectionForm,
} from '@/types/selection';

interface PanelAccessBatchModalProps {
  open: boolean;
  forms: SelectionForm[];
  defaultFormId?: string;
  onClose: () => void;
  onCreated: (created: PanelAccessPublicView[]) => void;
}

interface MemberDraft {
  name: string;
  roleTitle: string;
  email: string;
}

export default function PanelAccessBatchModal({
  open,
  forms,
  defaultFormId = '',
  onClose,
  onCreated,
}: PanelAccessBatchModalProps) {
  const [members, setMembers] = useState<MemberDraft[]>([
    { name: '', roleTitle: 'Ketua Tim Seleksi', email: '' },
    { name: '', roleTitle: 'Anggota Penilai', email: '' },
  ]);
  const [isAllForms, setIsAllForms] = useState(defaultFormId === '');
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>(
    defaultFormId ? [defaultFormId] : []
  );
  const [allowedStageIds, setAllowedStageIds] = useState<string[]>([]);
  const [canScore, setCanScore] = useState(true);
  const [canAdvanceStage, setCanAdvanceStage] = useState(false);
  const [canViewFiles, setCanViewFiles] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const availableStages = useMemo(() => {
    const targetForms = isAllForms
      ? forms
      : forms.filter((f) => selectedFormIds.includes(f.id));
    const map = new Map<string, string>();
    for (const f of targetForms) {
      for (const st of resolveFormStages(f)) {
        if (!map.has(st.id)) {
          map.set(st.id, st.name);
        }
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [forms, isAllForms, selectedFormIds]);

  if (!open) return null;

  const addMemberRow = () => {
    if (members.length >= 10) {
      toast.error('Maksimal 10 panitia dalam 1 batch generate kode.');
      return;
    }
    setMembers((prev) => [
      ...prev,
      { name: '', roleTitle: 'Anggota Penilai', email: '' },
    ]);
  };

  const fillTenSlots = () => {
    setMembers((prev) => {
      const next = [...prev];
      while (next.length < 10) {
        next.push({
          name: `Panitia Penilai ${next.length + 1}`,
          roleTitle: 'Anggota Tim Penilai',
          email: '',
        });
      }
      return next.slice(0, 10);
    });
  };

  const updateMember = (idx: number, patch: Partial<MemberDraft>) => {
    setMembers((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, ...patch } : m))
    );
  };

  const removeMember = (idx: number) => {
    if (members.length <= 1) return;
    setMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleFormId = (id: string) => {
    setSelectedFormIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleStageId = (id: string) => {
    setAllowedStageIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = members
      .map((m) => ({
        name: m.name.trim(),
        roleTitle: m.roleTitle.trim() || 'Panitia Penilai',
        email: m.email.trim(),
      }))
      .filter((m) => m.name.length >= 2);

    if (cleaned.length === 0) {
      toast.error('Isi minimal satu nama panitia (minimal 2 karakter).');
      return;
    }
    if (!isAllForms && selectedFormIds.length === 0) {
      toast.error('Pilih minimal satu program seleksi atau centang Semua Program.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminFetch<PanelAccessPublicView[]>(
        '/api/admin/panel-access',
        {
          method: 'POST',
          body: JSON.stringify({
            members: cleaned,
            formIds: isAllForms ? [] : selectedFormIds,
            isAllForms,
            allowedStageIds,
            permissions: {
              canScore,
              canAdvanceStage,
              canViewFiles,
            },
          }),
        }
      );

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Gagal membuat kode akses panitia.');
      }

      toast.success(
        `${res.data.length} kode akses panitia seleksi berhasil dibuat.`
      );
      onCreated(res.data);
      onClose();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Gagal membuat kode akses.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ui-modal-backdrop" onClick={onClose}>
      <div
        className="ui-modal-panel max-w-3xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-700" />
              <span>Generate Kode Akses Panitia Seleksi (1–10 Panitia)</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Setiap panitia mendapat kode unik format KND-XXXX-XXXX untuk masuk ke Portal Penilai.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Program Scope */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Ruang Lingkup Program Seleksi
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllForms}
                  onChange={(e) => setIsAllForms(e.target.checked)}
                  className="rounded accent-emerald-700"
                />
                <span>Akses Semua Program Seleksi</span>
              </label>
            </div>

            {!isAllForms && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2.5 rounded-xl border border-zinc-200 bg-zinc-50">
                {forms.map((f) => {
                  const checked = selectedFormIds.includes(f.id);
                  return (
                    <label
                      key={f.id}
                      className="flex items-start gap-2 text-xs text-zinc-800 cursor-pointer p-1.5 rounded-lg hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFormId(f.id)}
                        className="mt-0.5 rounded accent-emerald-700"
                      />
                      <span className="font-medium leading-snug">{f.title}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stage Restrictions */}
          {availableStages.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Pembatasan Tahapan (Opsional — Kosongkan untuk Semua Tahap)
              </p>
              <div className="flex flex-wrap gap-2">
                {availableStages.map((st) => {
                  const active = allowedStageIds.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => toggleStageId(st.id)}
                      className={
                        active
                          ? 'px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white cursor-pointer'
                          : 'px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 cursor-pointer'
                      }
                    >
                      {st.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Permissions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={canScore}
                onChange={(e) => setCanScore(e.target.checked)}
                className="rounded accent-emerald-700"
              />
              <span>Beri Nilai &amp; Rekomendasi</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={canViewFiles}
                onChange={(e) => setCanViewFiles(e.target.checked)}
                className="rounded accent-emerald-700"
              />
              <span>Lihat &amp; Unduh Berkas</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={canAdvanceStage}
                onChange={(e) => setCanAdvanceStage(e.target.checked)}
                className="rounded accent-emerald-700"
              />
              <span>Pindahkan Tahap Kandidat</span>
            </label>
          </div>

          {/* Members rows (max 10) */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Daftar Anggota Panitia ({members.length} / 10)
              </p>
              <div className="flex items-center gap-2">
                {members.length < 10 && (
                  <button
                    type="button"
                    onClick={fillTenSlots}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Siapkan 10 Slot Sekaligus
                  </button>
                )}
                <button
                  type="button"
                  onClick={addMemberRow}
                  disabled={members.length >= 10}
                  className="ui-btn-secondary px-2.5 py-1 text-xs disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {members.map((member, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-zinc-50 border border-zinc-200 rounded-xl p-2"
                >
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) =>
                        updateMember(idx, { name: e.target.value })
                      }
                      placeholder={`Nama Panitia ${idx + 1} *`}
                      className="ui-input text-xs bg-white py-1.5"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={member.roleTitle}
                      onChange={(e) =>
                        updateMember(idx, { roleTitle: e.target.value })
                      }
                      placeholder="Peran (mis. Penguji Teknis)"
                      className="ui-input text-xs bg-white py-1.5"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="email"
                      value={member.email}
                      onChange={(e) =>
                        updateMember(idx, { email: e.target.value })
                      }
                      placeholder="Email (opsional)"
                      className="ui-input text-xs bg-white py-1.5"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeMember(idx)}
                      disabled={members.length <= 1}
                      className="p-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="ui-btn-secondary px-4 py-2 text-xs sm:text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="ui-btn-accent px-5 py-2 text-xs sm:text-sm"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Generate Kode Akses</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

