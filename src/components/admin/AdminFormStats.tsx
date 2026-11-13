'use client';

interface AdminFormStatsProps {
  totalForms: number;
  openForms: number;
  totalSubmissions: number;
}

export default function AdminFormStats({
  totalForms,
  openForms,
  totalSubmissions,
}: AdminFormStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
      <div className="ui-card-compact p-4 sm:p-5">
        <p className="ui-eyebrow">Total Formulir</p>
        <p className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-1 font-mono">
          {totalForms}
        </p>
      </div>
      <div className="ui-card-compact p-4 sm:p-5">
        <p className="ui-eyebrow">Sedang Dibuka</p>
        <p className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1 font-mono">
          {openForms}
        </p>
      </div>
      <div className="ui-card-compact p-4 sm:p-5">
        <p className="ui-eyebrow">Total Pendaftar Masuk</p>
        <p className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-1 font-mono">
          {totalSubmissions}
        </p>
      </div>
    </div>
  );
}

