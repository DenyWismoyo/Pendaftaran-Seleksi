'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FilePlus2, FolderKanban, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AdminGuard from '@/components/AdminGuard';
import AdminFormListItem from '@/components/admin/AdminFormListItem';
import AdminFormStats from '@/components/admin/AdminFormStats';
import { adminFetch } from '@/lib/adminClient';
import { STARTER_FORM_TEMPLATES } from '@/lib/defaultTemplates';
import { SelectionForm, SelectionFormStatus } from '@/types/selection';

function AdminDashboardContent() {
  const [forms, setForms] = useState<SelectionForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadForms = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch<SelectionForm[]>('/api/admin/forms');
    if (res.success && res.data) {
      setForms(res.data);
    } else if (res.error) {
      toast.error(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleImportStarterTemplates = async () => {
    setSeeding(true);
    try {
      for (const tpl of STARTER_FORM_TEMPLATES) {
        await adminFetch('/api/admin/forms', {
          method: 'POST',
          body: JSON.stringify(tpl),
        });
      }
      toast.success('2 template formulir seleksi bawaan berhasil ditambahkan.');
      await loadForms();
    } catch {
      toast.error('Gagal mengimpor template bawaan.');
    } finally {
      setSeeding(false);
    }
  };

  const handleStatusChange = async (id: string, nextStatus: SelectionFormStatus) => {
    const res = await adminFetch(`/api/admin/forms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.success) {
      toast.success('Status formulir diperbarui.');
      setForms((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: nextStatus } : f))
      );
    } else {
      toast.error(res.error || 'Gagal memperbarui status.');
    }
  };

  const handleDelete = async (form: SelectionForm) => {
    if (
      !window.confirm(
        `Hapus formulir "${form.title}"? Data pendaftar yang sudah masuk tetap tersimpan.`
      )
    ) {
      return;
    }
    const res = await adminFetch(`/api/admin/forms/${form.id}`, {
      method: 'DELETE',
    });
    if (res.success) {
      toast.success('Formulir dihapus.');
      setForms((prev) => prev.filter((f) => f.id !== form.id));
    } else {
      toast.error(res.error || 'Gagal menghapus formulir.');
    }
  };

  const totalSubmissions = forms.reduce(
    (acc, f) => acc + (f.submissionCount || 0),
    0
  );
  const openForms = forms.filter((f) => f.status === 'OPEN').length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminFormStats
        totalForms={forms.length}
        openForms={openForms}
        totalSubmissions={totalSubmissions}
      />

      <div className="ui-mobile-pad flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="ui-section-title">Manajemen Formulir Seleksi</h1>
          <p className="text-xs text-zinc-500">
            Kelola jadwal pembukaan, susunan berkas unggahan, dan tautan publik.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleImportStarterTemplates}
            disabled={seeding}
            className="ui-btn-secondary text-xs sm:text-sm"
          >
            {seeding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FolderKanban className="w-4 h-4" />
            )}
            <span>Import Template Siap Pakai</span>
          </button>

          <Link href="/admin/forms/new" className="ui-btn-primary text-xs sm:text-sm">
            <FilePlus2 className="w-4 h-4" />
            <span>Buat Formulir Baru</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-zinc-900" />
        </div>
      ) : forms.length === 0 ? (
        <div className="ui-card-dashed p-10 sm:p-12 text-center space-y-3">
          <p className="text-base font-bold text-zinc-800">
            Belum ada formulir seleksi
          </p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Klik &ldquo;Import Template Siap Pakai&rdquo; untuk membuat contoh form
            Pelatihan Vokasi &amp; Magang, atau rancang formulir kustom dari awal.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => (
            <AdminFormListItem
              key={form.id}
              form={form}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}
