'use client';

import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardIdentityFieldsProps {
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  hasDuplicate: boolean;
  onNameChange: (val: string) => void;
  onEmailChange: (val: string) => void;
  onPhoneChange: (val: string) => void;
  onClearDuplicate: () => void;
}

export default function WizardIdentityFields({
  applicantName,
  applicantEmail,
  applicantPhone,
  hasDuplicate,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onClearDuplicate,
}: WizardIdentityFieldsProps) {
  const emailTrimmed = applicantEmail.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);
  const phoneDigits = applicantPhone.replace(/\D/g, '');
  const isPhoneValid = phoneDigits.length >= 8;
  const isNameValid = applicantName.trim().length >= 2;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div className="sm:col-span-2 space-y-1.5">
        <label className="text-sm font-semibold text-zinc-800 block">
          Nama Lengkap <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={applicantName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Sesuai KTP / Dokumen Identitas Resmi"
          className="ui-input"
        />
        {isNameValid && (
          <p className="text-[11px] text-emerald-700 inline-flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>Nama terbaca valid</span>
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-zinc-800 block">
          Email Aktif <span className="text-rose-500">*</span>
        </label>
        <input
          type="email"
          value={applicantEmail}
          onChange={(e) => {
            onEmailChange(e.target.value);
            if (hasDuplicate) onClearDuplicate();
          }}
          placeholder="nama@email.com"
          className="ui-input"
        />
        <p
          className={cn(
            'text-[11px]',
            emailTrimmed.length === 0
              ? 'text-zinc-500'
              : isEmailValid
                ? 'text-emerald-700 font-medium'
                : 'text-amber-700 font-medium'
          )}
        >
          {emailTrimmed.length === 0
            ? 'Digunakan sebagai verifikasi saat cek status kelulusan.'
            : isEmailValid
              ? 'Format email valid.'
              : 'Pastikan format email lengkap (contoh: nama@email.com).'}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-zinc-800 block">
          Nomor WhatsApp / HP <span className="text-rose-500">*</span>
        </label>
        <input
          type="tel"
          value={applicantPhone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="0812xxxxxxxx"
          className="ui-input"
        />
        <p
          className={cn(
            'text-[11px]',
            applicantPhone.trim().length === 0
              ? 'text-zinc-500'
              : isPhoneValid
                ? 'text-emerald-700 font-medium'
                : 'text-amber-700 font-medium'
          )}
        >
          {applicantPhone.trim().length === 0
            ? 'Pastikan aktif untuk pemberitahuan jadwal seleksi.'
            : isPhoneValid
              ? `${phoneDigits.length} digit tersimpan.`
              : `Minimal 8 digit angka (saat ini ${phoneDigits.length} digit).`}
        </p>
      </div>
    </div>
  );
}
