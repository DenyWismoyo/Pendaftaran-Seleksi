'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, Loader2, Plus, Printer, Users } from 'lucide-react';
import { toast } from 'sonner';
import PanelAccessBatchModal from '@/components/admin/PanelAccessBatchModal';
import PanelAccessCard from '@/components/admin/PanelAccessCard';
import { adminFetch } from '@/lib/adminClient';
import { PanelAccessPublicView, SelectionForm } from '@/types/selection';

export default function PanitiaManager() {
  const [panelList, setPanelList] = useState<PanelAccessPublicView[]>([]);
  const [forms, setForms] = useState<SelectionForm[]>([]);
  const [filterFormId, setFilterFormId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [panelRes, formsRes] = await Promise.all([
      adminFetch<PanelAccessPublicView[]>('/api/admin/panel-access'),
      adminFetch<SelectionForm[]>('/api/admin/forms'),
    ]);
    if (panelRes.success && panelRes.data) setPanelList(panelRes.data);
    if (formsRes.success && formsRes.data) setForms(formsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filteredList = useMemo(() => {
    if (!filterFormId) return panelList;
    return panelList.filter(
      (item) => item.isAllForms || item.formIds.includes(filterFormId)
    );
  }, [panelList, filterFormId]);

  const handleToggleActive = async (item: PanelAccessPublicView) => {
    setBusyId(item.id);
    try {
      const res = await adminFetch<PanelAccessPublicView>(
        `/api/admin/panel-access/${item.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isActive: !item.isActive }),
        }
      );
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Gagal memperbarui status.');
      }
      setPanelList((prev) =>
        prev.map((p) => (p.id === item.id ? res.data! : p))
      );
      toast.success(
        res.data.isActive
          ? `Akses ${item.name} diaktifkan.`
          : `Akses ${item.name} dinonaktifkan.`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRegenerate = async (item: PanelAccessPublicView) => {
    if (
      !confirm(
        `Buat kode akses baru untuk ${item.name}? Kode lama tidak akan berlaku lagi.`
      )
    ) {
      return;
    }
    setBusyId(item.id);
    try {
      const res = await adminFetch<PanelAccessPublicView>(
        `/api/admin/panel-access/${item.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ regenerateCode: true }),
        }
      );
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Gagal memperbarui kode.');
      }
      setPanelList((prev) =>
        prev.map((p) => (p.id === item.id ? res.data! : p))
      );
      toast.success(`Kode akses baru untuk ${item.name} berhasil diterbitkan.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat kode baru.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: PanelAccessPublicView) => {
    if (!confirm(`Hapus akses panitia "${item.name}" secara permanen?`)) return;
    setBusyId(item.id);
    try {
      const res = await adminFetch(`/api/admin/panel-access/${item.id}`, {
        method: 'DELETE',
      });
      if (!res.success) {
        throw new Error(res.error || 'Gagal menghapus panitia.');
      }
      setPanelList((prev) => prev.filter((p) => p.id !== item.id));
      toast.success(`Panitia ${item.name} dihapus.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="ui-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-zinc-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-700" />
            <span>Panitia Seleksi &amp; Kode Akses Penilai</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Buat hingga 10 kode akses unik panitia sekaligus. Penilai login di{' '}
            <span className="font-mono font-semibold text-zinc-800">/penilaian</span>{' '}
            tanpa perlu akun admin Google.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="ui-btn-secondary px-3.5 py-2 text-xs sm:text-sm print:hidden"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Daftar Kode</span>
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="ui-btn-accent px-4 py-2 text-xs sm:text-sm print:hidden"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Kode Panitia (1–10)</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <Users className="w-4 h-4 text-zinc-500" />
          <span>
            Menampilkan <strong>{filteredList.length}</strong> panitia (
            {filteredList.filter((i) => i.isActive).length} aktif)
          </span>
        </div>

        <select
          value={filterFormId}
          onChange={(e) => setFilterFormId(e.target.value)}
          className="ui-input bg-white text-xs sm:text-sm w-full sm:w-72"
        >
          <option value="">Semua Program Seleksi</option>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-zinc-900" />
        </div>
      ) : filteredList.length === 0 ? (
        <div className="ui-card-dashed p-10 text-center space-y-3">
          <p className="text-sm text-zinc-600 font-medium">
            Belum ada panitia seleksi terdaftar pada filter ini.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="ui-btn-primary px-4 py-2 text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Kode Akses Panitia Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((item) => (
            <PanelAccessCard
              key={item.id}
              item={item}
              forms={forms}
              busyId={busyId}
              onToggleActive={handleToggleActive}
              onRegenerate={handleRegenerate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <PanelAccessBatchModal
        open={modalOpen}
        forms={forms}
        defaultFormId={filterFormId}
        onClose={() => setModalOpen(false)}
        onCreated={(created) =>
          setPanelList((prev) => [...created, ...prev])
        }
      />
    </div>
  );
}

