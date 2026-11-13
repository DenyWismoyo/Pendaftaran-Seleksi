'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AdminGuard from '@/components/AdminGuard';
import FormBuilder from '@/components/FormBuilder';
import { adminFetch } from '@/lib/adminClient';
import { SelectionForm } from '@/types/selection';

function EditFormContent() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [form, setForm] = useState<SelectionForm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    adminFetch<SelectionForm>(`/api/admin/forms/${id}`)
      .then((res) => {
        if (res.success && res.data) {
          setForm(res.data);
        } else {
          toast.error(res.error || 'Formulir tidak ditemukan.');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-700">
          Formulir tidak ditemukan.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Daftar Formulir</span>
        </Link>
        <h1 className="text-xl font-bold text-slate-900">
          Edit Formulir: {form.title}
        </h1>
      </div>

      <FormBuilder initialData={form} />
    </div>
  );
}

export default function EditFormPage() {
  return (
    <AdminGuard>
      <EditFormContent />
    </AdminGuard>
  );
}

