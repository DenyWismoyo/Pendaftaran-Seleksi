'use client';

import { Loader2, UserPlus } from 'lucide-react';
import { ADMIN_ROLES } from '@/lib/constants';

interface AddAdminUserFormProps {
  name: string;
  email: string;
  role: string;
  password: string;
  saving: boolean;
  onNameChange: (val: string) => void;
  onEmailChange: (val: string) => void;
  onRoleChange: (val: string) => void;
  onPasswordChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AddAdminUserForm({
  name,
  email,
  role,
  password,
  saving,
  onNameChange,
  onEmailChange,
  onRoleChange,
  onPasswordChange,
  onSubmit,
}: AddAdminUserFormProps) {
  return (
    <form onSubmit={onSubmit} className="ui-card p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
        <UserPlus className="w-4 h-4" />
        <span>Tambah / Daftarkan Panitia Baru</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nama Lengkap"
          className="ui-input"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="email@panitia.id"
          className="ui-input"
        />
        <select
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
          className="ui-input bg-white"
        >
          {ADMIN_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Sandi awal (jika akun baru)"
          className="ui-input"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-zinc-500">
          Hanya <code className="font-mono">super_admin</code> yang dapat menambah atau
          menghapus akun panitia.
        </p>
        <button
          type="submit"
          disabled={saving}
          className="ui-btn-primary text-xs sm:text-sm"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>Simpan Panitia</span>
        </button>
      </div>
    </form>
  );
}

