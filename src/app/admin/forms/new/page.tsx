'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AdminGuard from '@/components/AdminGuard';
import FormBuilder from '@/components/FormBuilder';

export default function NewFormPage() {
  return (
    <AdminGuard>
      <div className="space-y-4">
        <div className="ui-mobile-pad flex items-center justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Daftar Formulir</span>
            </Link>
            <h1 className="ui-section-title">
              Buat Formulir Seleksi Baru
            </h1>
          </div>
        </div>

        <FormBuilder />
      </div>
    </AdminGuard>
  );
}

