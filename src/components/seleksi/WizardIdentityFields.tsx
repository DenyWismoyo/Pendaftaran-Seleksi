'use client';

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
        <p className="text-[11px] text-zinc-500">
          Digunakan sebagai verifikasi saat cek status kelulusan.
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
        <p className="text-[11px] text-zinc-500">
          Pastikan aktif untuk pemberitahuan jadwal seleksi.
        </p>
      </div>
    </div>
  );
}

