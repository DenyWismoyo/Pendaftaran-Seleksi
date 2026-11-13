'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Copy,
  Edit3,
  ExternalLink,
  FilePlus2,
  Loader2,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminGuard from '@/components/AdminGuard';
import { adminFetch } from '@/lib/adminClient';
import { FORM_STATUS_META } from '@/lib/constants';
import { STARTER_FORM_TEMPLATES } from '@/lib/defaultTemplates';
import { SelectionForm, SelectionFormStatus } from '@/types/selection';
import { cn, formatDateID } from '@/lib/utils';

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
      toast.success('2 template formulir seleksi bawaan berhasil ditambahkan!');
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
        `Hapus formulir "${form.title}"? Data pendaftar yang sudah masuk tidak ikut terhapus otomatis.`
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
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            Total Formulir Seleksi
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{forms.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            Formulir Aktif (Dibuka)
          </p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{openForms}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            Total Pendaftar Masuk
          </p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">
            {totalSubmissions}
          </p>
        </div>
      </div>

      {/* Actions Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Manajemen Formulir Seleksi
          </h1>
          <p className="text-xs text-slate-500">
            Buat formulir baru, bagikan link pendaftaran publik, dan kelola status
            penerimaan.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleImportStarterTemplates}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs sm:text-sm font-semibold hover:bg-indigo-100 disabled:opacity-60 cursor-pointer"
          >
            {seeding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Import Template Bawaan</span>
          </button>

          <Link
            href="/admin/forms/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-semibold hover:bg-indigo-700"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Buat Formulir Baru</span>
          </Link>
        </div>
      </div>

      {/* Forms List */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
        </div>
      ) : forms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <p className="text-base font-semibold text-slate-800">
            Belum ada formulir seleksi
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Klik &ldquo;Import Template Bawaan&rdquo; untuk langsung mencoba template
            Seleksi Pelatihan Vokasi &amp; Magang, atau buat formulir kustom sendiri.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => {
            const meta = FORM_STATUS_META[form.status] || FORM_STATUS_META.OPEN;
            const publicPath = `/seleksi/${form.slug}`;

            return (
              <div
                key={form.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                      {form.category}
                    </span>
                    <span
                      className={cn(
                        'text-[11px] font-semibold px-2.5 py-0.5 rounded-md border',
                        meta.badgeClass
                      )}
                    >
                      {meta.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      Dibuat {formatDateID(form.createdAt)}
                    </span>
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {form.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="font-mono text-slate-600">{publicPath}</span>
                    <span>
                      <strong>{form.fields.length}</strong> field (
                      {form.fields.filter((f) => f.type === 'file').length} berkas)
                    </span>
                    <span>
                      <strong>{form.submissionCount || 0}</strong> pendaftar
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      handleStatusChange(
                        form.id,
                        e.target.value as SelectionFormStatus
                      )
                    }
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                  >
                    <option value="OPEN">Dibuka</option>
                    <option value="DRAFT">Draf</option>
                    <option value="CLOSED">Ditutup</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const fullUrl = `${window.location.origin}${publicPath}`;
                      navigator.clipboard.writeText(fullUrl);
                      toast.success('Link formulir disalin!');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    title="Salin Link Publik"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Link</span>
                  </button>

                  <Link
                    href={publicPath}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka</span>
                  </Link>

                  <Link
                    href={`/admin/submissions?formId=${form.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Pendaftar</span>
                  </Link>

                  <Link
                    href={`/admin/forms/${form.id}`}
                    className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                    title="Edit Formulir"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(form)}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Hapus Formulir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
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
