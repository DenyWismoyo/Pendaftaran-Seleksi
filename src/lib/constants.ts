export const COLLECTIONS = {
  FORMS: 'selection_forms',
  SUBMISSIONS: 'selection_submissions',
} as const;

export const ADMIN_ROLES = [
  'super_admin',
  'admin',
  'admin_pelatihan',
  'operator_pelatihan',
  'admin_tenant',
  'operator_tenant',
] as const;

export const SELECTION_CATEGORIES = [
  'Pelatihan Vokasi',
  'Inkubasi Startup & Tenant',
  'Magang & PKL',
  'Rekrutmen & Karier',
  'Beasiswa & Sertifikasi',
  'Umum / Lainnya',
] as const;

export const FORM_STATUS_META = {
  OPEN: {
    label: 'Dibuka',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  DRAFT: {
    label: 'Draf',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  CLOSED: {
    label: 'Ditutup',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
} as const;

export const SUBMISSION_STATUS_META = {
  SUBMITTED: {
    label: 'Menunggu Verifikasi',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  REVIEWING: {
    label: 'Dalam Peninjauan',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  ACCEPTED: {
    label: 'Lolos Seleksi',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Tidak Lolos',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
} as const;
