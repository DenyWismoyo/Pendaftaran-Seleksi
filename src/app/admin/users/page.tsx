'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Shield, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import AdminGuard from '@/components/AdminGuard';
import { adminFetch } from '@/lib/adminClient';
import { ADMIN_ROLES } from '@/lib/constants';

interface AdminUserItem {
  uid: string;
  email: string;
  name: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
}

function AdminUsersContent() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('admin');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch<AdminUserItem[]>('/api/admin/users');
    if (res.success && res.data) {
      setUsers(res.data);
    } else if (res.error) {
      toast.error(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminFetch<AdminUserItem>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          role,
          ...(password.trim() ? { password: password.trim() } : {}),
        }),
      });
      if (!res.success) {
        throw new Error(res.error || 'Gagal menambahkan akun panitia.');
      }
      toast.success('Akun panitia berhasil ditambahkan ke database seleksi.');
      setEmail('');
      setName('');
      setPassword('');
      await loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambah panitia.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: AdminUserItem) => {
    const nextActive = item.isActive === false;
    const res = await adminFetch('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ uid: item.uid, isActive: nextActive }),
    });
    if (res.success) {
      toast.success(nextActive ? 'Akun diaktifkan.' : 'Akun dinonaktifkan.');
      setUsers((prev) =>
        prev.map((u) => (u.uid === item.uid ? { ...u, isActive: nextActive } : u))
      );
    } else {
      toast.error(res.error || 'Gagal mengubah status akun.');
    }
  };

  const handleDelete = async (item: AdminUserItem) => {
    if (!window.confirm(`Hapus akses panitia untuk ${item.email}?`)) return;
    const res = await adminFetch(`/api/admin/users?uid=${encodeURIComponent(item.uid)}`, {
      method: 'DELETE',
    });
    if (res.success) {
      toast.success('Akses panitia dihapus.');
      setUsers((prev) => prev.filter((u) => u.uid !== item.uid));
    } else {
      toast.error(res.error || 'Gagal menghapus akses.');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="ui-mobile-pad">
        <h1 className="ui-section-title">
          Manajemen Akun Panitia
        </h1>
        <p className="text-xs text-zinc-500">
          Daftar akun pengelola yang memiliki akses verifikasi berkas dan pengelolaan formulir seleksi.
        </p>
      </div>

      {/* Add Admin Form */}
      <form
        onSubmit={handleAddUser}
        className="ui-card p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
          <UserPlus className="w-4 h-4" />
          <span>Tambah / Daftarkan Panitia Baru</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama Lengkap"
            className="ui-input"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@panitia.id"
            className="ui-input"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
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

      {/* Admin List */}
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
                    onClick={() => handleToggleActive(u)}
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
                    onClick={() => handleDelete(u)}
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
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <AdminUsersContent />
    </AdminGuard>
  );
}

