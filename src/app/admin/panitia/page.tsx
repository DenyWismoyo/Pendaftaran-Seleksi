import AdminGuard from '@/components/AdminGuard';
import PanitiaManager from '@/components/admin/PanitiaManager';

export default function AdminPanitiaPage() {
  return (
    <AdminGuard>
      <PanitiaManager />
    </AdminGuard>
  );
}
