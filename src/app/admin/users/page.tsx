'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import AdminGuard from '@/components/AdminGuard';
import AddAdminUserForm from '@/components/admin/AddAdminUserForm';
import AdminUsersList, { AdminUserItem } from '@/components/admin/AdminUsersList';
import { adminFetch } from '@/lib/adminClient';

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
    const res = await adminFetch(
      `/api/admin/users?uid=${encodeURIComponent(item.uid)}`,
      { method: 'DELETE' }
    );
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
        <h1 className="ui-section-title">Manajemen Akun Panitia</h1>
        <p className="text-xs text-zinc-500">
          Daftar akun pengelola yang memiliki akses verifikasi berkas dan
          pengelolaan formulir seleksi.
        </p>
      </div>

      <AddAdminUserForm
        name={name}
        email={email}
        role={role}
        password={password}
        saving={saving}
        onNameChange={setName}
        onEmailChange={setEmail}
        onRoleChange={setRole}
        onPasswordChange={setPassword}
        onSubmit={handleAddUser}
      />

      <AdminUsersList
        users={users}
        loading={loading}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
      />
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
