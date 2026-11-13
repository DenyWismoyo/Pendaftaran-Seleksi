'use client';

import { Loader2, Shield, Trash2 } from 'lucide-react';

export interface AdminUserItem {
  uid: string;
  email: string;
  name: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
}

interface AdminUsersListProps {
  users: AdminUserItem[];
  loading: boolean;
  onToggleActive: (item: AdminUserItem) => void;
  onDelete: (item: AdminUserItem) => void;
}

export default function AdminUsersList({
  users,
  loading,
  onToggleActive,
  onDelete,
}: AdminUsersListProps) {
  return (
    <div className="ui-card overflow-hidden">
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-800" />
        </div>
      ) : users.length === 0 ? (
        <div className="p-8 text-center text-sm text-zinc-500">
          Belum ada data akun panitia yang terdaftar.
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {users.map((u) => (
            <div
              key={u.uid}
              className="p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-zinc-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-900 truncate">
                    {u.name || u.email}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold bg-zinc-100 text-zinc-800 px-2.5 py-1 rounded-md">
                  {u.role}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleActive(u)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md border cursor-pointer ${
                    u.isActive !== false
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                  }`}
                >
                  {u.isActive !== false ? 'Aktif' : 'Nonaktif'}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(u)}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                  title="Hapus akses"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

