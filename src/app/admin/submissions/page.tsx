'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminGuard from '@/components/AdminGuard';
import { adminFetch } from '@/lib/adminClient';
import { SUBMISSION_STATUS_META } from '@/lib/constants';
import {
  AiEvaluation,
  SelectionForm,
  SelectionSubmission,
  SubmissionStatus,
} from '@/types/selection';
import { cn, formatBytes, formatDateID } from '@/lib/utils';

function SubmissionsContent() {
  const searchParams = useSearchParams();
  const initialFormId = searchParams.get('formId') || '';

  const [forms, setForms] = useState<SelectionForm[]>([]);
  const [submissions, setSubmissions] = useState<SelectionSubmission[]>([]);
  const [selectedFormId, setSelectedFormId] = useState(initialFormId);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedSub, setSelectedSub] = useState<SelectionSubmission | null>(null);
  const [reviewStatus, setReviewStatus] = useState<SubmissionStatus>('SUBMITTED');
  const [reviewerNote, setReviewerNote] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [evaluatingAi, setEvaluatingAi] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [formsRes, subsRes] = await Promise.all([
      adminFetch<SelectionForm[]>('/api/admin/forms'),
      adminFetch<SelectionSubmission[]>(
        `/api/admin/submissions${
          selectedFormId ? `?formId=${encodeURIComponent(selectedFormId)}` : ''
        }`
      ),
    ]);

    if (formsRes.success && formsRes.data) setForms(formsRes.data);
    if (subsRes.success && subsRes.data) {
      setSubmissions(subsRes.data);
      if (subsRes.data.length > 0 && !selectedSub) {
        const first = subsRes.data[0];
        setSelectedSub(first);
        setReviewStatus(first.status);
        setReviewerNote(first.reviewerNote || '');
      }
    }
    setLoading(false);
  }, [selectedFormId, selectedSub]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormId]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.applicantName.toLowerCase().includes(q) ||
        s.applicantEmail.toLowerCase().includes(q) ||
        s.registrationCode.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [submissions, statusFilter, search]);

  const handleSelectSubmission = (sub: SelectionSubmission) => {
    setSelectedSub(sub);
    setReviewStatus(sub.status);
    setReviewerNote(sub.reviewerNote || '');
  };

  const handleSaveReview = async () => {
    if (!selectedSub) return;
    setSavingReview(true);
    try {
      const res = await adminFetch<SelectionSubmission>('/api/admin/submissions', {
        method: 'PATCH',
        body: JSON.stringify({
          id: selectedSub.id,
          status: reviewStatus,
          reviewerNote,
        }),
      });
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Gagal menyimpan hasil verifikasi.');
      }
      setSubmissions((prev) =>
        prev.map((item) => (item.id === res.data!.id ? res.data! : item))
      );
      setSelectedSub(res.data);
      toast.success('Status seleksi pelamar diperbarui.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally {
      setSavingReview(false);
    }
  };

  const handleAiEvaluate = async () => {
    if (!selectedSub) return;
    setEvaluatingAi(true);
    try {
      const res = await adminFetch<AiEvaluation>('/api/admin/ai', {
        method: 'POST',
        body: JSON.stringify({
          action: 'evaluate-submission',
          submissionId: selectedSub.id,
        }),
      });
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Gagal menjalankan analisis AI.');
      }
      const updated = { ...selectedSub, aiEvaluation: res.data };
      setSelectedSub(updated);
      setSubmissions((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      toast.success('Evaluasi Clario AI selesai!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal analisis AI.');
    } finally {
      setEvaluatingAi(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredSubmissions.length === 0) {
      toast.error('Tidak ada data pendaftar untuk diekspor.');
      return;
    }
    const headers = [
      'Kode Pendaftaran',
      'Program Seleksi',
      'Nama Pelamar',
      'Email',
      'No HP/WA',
      'Status',
      'Skor AI',
      'Jumlah Berkas',
      'Tanggal Daftar',
      'Catatan Panitia',
    ];
    const rows = filteredSubmissions.map((s) => [
      s.registrationCode,
      s.formTitle,
      s.applicantName,
      s.applicantEmail,
      s.applicantPhone,
      s.status,
      s.aiEvaluation?.score ?? '',
      s.files.length,
      s.createdAt,
      s.reviewerNote || '',
    ]);

    const csv = [headers, ...rows]
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-seleksi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentFormDef = useMemo(
    () => forms.find((f) => f.id === selectedSub?.formId),
    [forms, selectedSub]
  );

  return (
    <div className="space-y-5">
      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, email, atau kode..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedFormId}
            onChange={(e) => {
              setSelectedFormId(e.target.value);
              setSelectedSub(null);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
          >
            <option value="">Semua Program Seleksi</option>
            {forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="SUBMITTED">Menunggu Verifikasi</option>
            <option value="REVIEWING">Dalam Peninjauan</option>
            <option value="ACCEPTED">Lolos Seleksi</option>
            <option value="REJECTED">Tidak Lolos</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          Belum ada data pendaftar yang sesuai filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* List Pendaftar */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
            {filteredSubmissions.map((sub) => {
              const meta =
                SUBMISSION_STATUS_META[sub.status] ||
                SUBMISSION_STATUS_META.SUBMITTED;
              const isActive = selectedSub?.id === sub.id;

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSelectSubmission(sub)}
                  className={cn(
                    'w-full text-left rounded-2xl border p-4 transition-all cursor-pointer space-y-2',
                    isActive
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-500">
                      {sub.registrationCode}
                    </span>
                    <span
                      className={cn(
                        'text-[11px] font-semibold px-2 py-0.5 rounded-md border',
                        meta.badgeClass
                      )}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">
                      {sub.applicantName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {sub.applicantEmail} • {sub.formTitle}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{sub.files.length} berkas terlampir</span>
                    {sub.aiEvaluation && (
                      <span className="font-semibold text-indigo-600">
                        Skor AI: {sub.aiEvaluation.score}/100
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail Panel */}
          {selectedSub && (
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-mono text-indigo-600 font-semibold">
                    {selectedSub.registrationCode}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedSub.applicantName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedSub.applicantEmail} • {selectedSub.applicantPhone} •{' '}
                    Daftar {formatDateID(selectedSub.createdAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAiEvaluate}
                  disabled={evaluatingAi}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold hover:bg-indigo-100 disabled:opacity-60 cursor-pointer"
                >
                  {evaluatingAi ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {selectedSub.aiEvaluation
                      ? 'Evaluasi Ulang AI'
                      : 'Analisis dengan Clario AI'}
                  </span>
                </button>
              </div>

              {/* AI Evaluation Box */}
              {selectedSub.aiEvaluation && (
                <div className="rounded-xl bg-indigo-50/70 border border-indigo-200 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Ringkasan Clario AI ({selectedSub.aiEvaluation.recommendation})
                    </span>
                    <span className="text-sm font-bold text-indigo-700">
                      Skor: {selectedSub.aiEvaluation.score}/100
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {selectedSub.aiEvaluation.summary}
                  </p>
                  {selectedSub.aiEvaluation.strengths.length > 0 && (
                    <div className="text-xs text-emerald-800">
                      <strong>Keunggulan:</strong>{' '}
                      {selectedSub.aiEvaluation.strengths.join('; ')}
                    </div>
                  )}
                  {selectedSub.aiEvaluation.gaps.length > 0 && (
                    <div className="text-xs text-amber-800">
                      <strong>Catatan/Celah:</strong>{' '}
                      {selectedSub.aiEvaluation.gaps.join('; ')}
                    </div>
                  )}
                </div>
              )}

              {/* Jawaban Formulir */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Jawaban Formulir
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(selectedSub.answers).map(([key, val]) => {
                    const fieldLabel =
                      currentFormDef?.fields.find((f) => f.id === key)?.label || key;
                    const display = Array.isArray(val)
                      ? val.join(', ')
                      : String(val || '-');

                    return (
                      <div
                        key={key}
                        className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1"
                      >
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          {fieldLabel}
                        </span>
                        <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                          {display}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Berkas Diunggah */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-bold text-slate-900">
                  Berkas Persyaratan ({selectedSub.files.length})
                </h3>
                {selectedSub.files.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Tidak ada berkas yang diunggah.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedSub.files.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {file.fieldLabel} — {file.fileName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {formatBytes(file.size)} • {file.mimeType}
                            </p>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Keputusan Verifikasi Panitia */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Keputusan &amp; Catatan Panitia
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={reviewStatus}
                    onChange={(e) =>
                      setReviewStatus(e.target.value as SubmissionStatus)
                    }
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="SUBMITTED">Menunggu Verifikasi</option>
                    <option value="REVIEWING">Dalam Peninjauan</option>
                    <option value="ACCEPTED">Lolos Seleksi</option>
                    <option value="REJECTED">Tidak Lolos</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleSaveReview}
                    disabled={savingReview}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
                  >
                    {savingReview && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Simpan Keputusan</span>
                  </button>
                </div>

                <textarea
                  rows={2}
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder="Catatan untuk pelamar (terlihat di halaman Cek Status)..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminSubmissionsPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <div className="py-20 flex justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          </div>
        }
      >
        <SubmissionsContent />
      </Suspense>
    </AdminGuard>
  );
}
