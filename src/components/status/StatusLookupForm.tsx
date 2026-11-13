'use client';

import { Loader2, Search } from 'lucide-react';

interface StatusLookupFormProps {
  code: string;
  email: string;
  loading: boolean;
  onCodeChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function StatusLookupForm({
  code,
  email,
  loading,
  onCodeChange,
  onEmailChange,
  onSubmit,
}: StatusLookupFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="no-print max-w-2xl mx-auto ui-card p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
    >
      <div className="sm:col-span-5 space-y-1.5">
        <label className="ui-label">Kode Pendaftaran</label>
        <input
          type="text"
          value={code}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          placeholder="SEL-2026-XXXXXX"
          className="ui-input font-mono uppercase"
        />
      </div>

      <div className="sm:col-span-5 space-y-1.5">
        <label className="ui-label">Email Pelamar</label>
        <input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="nama@email.com"
          className="ui-input"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="sm:col-span-2 ui-btn-primary"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Search className="w-4 h-4" />
        )}
        <span>Cek</span>
      </button>
    </form>
  );
}

