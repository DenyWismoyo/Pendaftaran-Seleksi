'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckSquare,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Search,
  Sparkles,
  X,
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
  UploadedFileMeta,
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<SubmissionStatus>('REVIEWING');
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const [reviewStatus, setReviewStatus] = useState<SubmissionStatus>('SUBMITTED');
  const [reviewerNote, setReviewerNote] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [evaluatingAi, setEvaluatingAi] = useState(false);

  const [previewFile, setPreviewFile] = useState<UploadedFileMeta | null>(null);

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

  const statusCounts = useMemo(() => {
    return {
      ALL: submissions.length,
      SUBMITTED: submissions.filter((s) => s.status === 'SUBMITTED').length,
      REVIEWING: submissions.filter((s) => s.status === 'REVIEWING').length,
      ACCEPTED: submissions.filter((s) => s.status === 'ACCEPTED').length,
      REJECTED: submissions.filter((s) => s.status === 'REJECTED').length,
    };
  }, [submissions]);

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

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) return;
    setBulkUpdating(true);
    try {
      const res = await adminFetch('/api/admin/submissions', {
        method: 'PATCH',
        body: JSON.stringify({
          ids: selectedIds,
          status: bulkStatus,
        }),
      });
      if (!res.success) {
        throw new Error(res.error || 'Gagal memperbarui status massal.');
      }
      setSubmissions((prev) =>
        prev.map((item) =>
          selectedIds.includes(item.id) ? { ...item, status: bulkStatus } : item
        )
      );
      if (selectedSub && selectedIds.includes(selectedSub.id)) {
        setSelectedSub({ ...selectedSub, status: bulkStatus });
        setReviewStatus(bulkStatus);
      }
      toast.success(`${selectedIds.length} pelamar berhasil diperbarui.`);
      setSelectedIds([]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal update massal.');
    } finally {
      setBulkUpdating(false);
    }
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
        throw new Error(res.error || 'Gagal menyimpan keputusan.');
      }
      setSubmissions((prev) =>
        prev.map((item) => (item.id === res.data!.id ? res.data! : item))
      );
      setSelectedSub(res.data);
      toast.success('Keputusan seleksi pelamar disimpan.');
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
        throw new Error(res.error || 'Gagal menjalankan penilaian otomatis.');
      }
      const updated = { ...selectedSub, aiEvaluation: res.data };
      setSelectedSub(updated);
      setSubmissions((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      toast.success('Ringkasan penilaian selesai.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menganalisis.');
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
      'Skor Awal',
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
      {/* Pipeline Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { key: 'ALL', label: 'Semua Pelamar', count: statusCounts.ALL },
          { key: 'SUBMITTED', label: 'Menunggu', count: statusCounts.SUBMITTED },
          { key: 'REVIEWING', label: 'Ditinjau', count: statusCounts.REVIEWING },
          { key: 'ACCEPTED', label: 'Lolos', count: statusCounts.ACCEPTED },
          { key: 'REJECTED', label: 'Tidak Lolos', count: statusCounts.REJECTED },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              'rounded-xl border p-3 text-left transition-colors cursor-pointer',
              statusFilter === tab.key
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
            )}
          >
            <p className="text-[11px] font-semibold opacity-80">{tab.label}</p>
            <p className="text-xl font-bold font-mono mt-0.5">{tab.count}</p>
          </button>
        ))}
      </div>

      {/* Filter & Bulk Action Toolbar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, email, atau kode..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <select
            value={selectedFormId}
            onChange={(e) => {
              setSelectedFormId(e.target.value);
              setSelectedSub(null);
              setSelectedIds([]);
            }}
            className="px-3 py-2 rounded-xl border border-zinc-200 text-xs sm:text-sm bg-white"
          >
            <option value="">Semua Program Seleksi</option>
            {forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-200">
              <CheckSquare className="w-3.5 h-3.5 text-zinc-700" />
              <span className="text-xs font-semibold text-zinc-800">
                {selectedIds.length} dipilih
              </span>
              <select
                value={bulkStatus}
                onChange={(e) =>
                  setBulkStatus(e.target.value as SubmissionStatus)
                }
                className="px-2 py-1 rounded-lg border border-zinc-200 bg-white text-xs"
              >
                <option value="REVIEWING">Dalam Peninjauan</option>
                <option value="ACCEPTED">Lolos Seleksi</option>
                <option value="REJECTED">Tidak Lolos</option>
              </select>
              <button
                type="button"
                onClick={handleBulkUpdate}
                disabled={bulkUpdating}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
              >
                {bulkUpdating ? '...' : 'Terapkan'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-zinc-900" />
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-500">
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
              const isChecked = selectedIds.includes(sub.id);

              return (
                <div
                  key={sub.id}
                  className={cn(
                    'rounded-2xl border p-4 transition-all flex items-start gap-3',
                    isActive
                      ? 'border-zinc-900 bg-white shadow-sm ring-1 ring-zinc-900'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelectId(sub.id)}
                    className="mt-1 rounded accent-zinc-900 cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => handleSelectSubmission(sub)}
                    className="flex-1 text-left space-y-1.5 cursor-pointer min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-zinc-500">
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
                      <p className="font-bold text-zinc-900 text-sm truncate">
                        {sub.applicantName}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {sub.applicantEmail} • {sub.formTitle}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>{sub.files.length} berkas terlampir</span>
                      {sub.aiEvaluation && (
                        <span className="font-mono font-semibold text-emerald-700">
                          Skor: {sub.aiEvaluation.score}/100
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Detail Panel */}
          {selectedSub && (
            <div className="lg:col-span-7 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
              <div className="border-b border-zinc-100 pb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-mono text-emerald-700 font-bold">
                    {selectedSub.registrationCode}
                  </span>
                  <h2 className="text-xl font-bold text-zinc-900">
                    {selectedSub.applicantName}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {selectedSub.applicantEmail} • {selectedSub.applicantPhone} •{' '}
                    Daftar {formatDateID(selectedSub.createdAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAiEvaluate}
                  disabled={evaluatingAi}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 text-xs font-semibold hover:bg-zinc-100 disabled:opacity-60 cursor-pointer"
                >
                  {evaluatingAi ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                  <span>
                    {selectedSub.aiEvaluation
                      ? 'Perbarui Ringkasan Skor'
                      : 'Ringkas & Skor Profil'}
                  </span>
                </button>
              </div>

              {selectedSub.aiEvaluation && (
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800">
                      Ringkasan Evaluasi ({selectedSub.aiEvaluation.recommendation})
                    </span>
                    <span className="text-sm font-mono font-bold text-emerald-700">
                      {selectedSub.aiEvaluation.score}/100
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 leading-relaxed">
                    {selectedSub.aiEvaluation.summary}
                  </p>
                  {selectedSub.aiEvaluation.strengths.length > 0 && (
                    <div className="text-xs text-emerald-800">
                      <strong>Kelebihan:</strong>{' '}
                      {selectedSub.aiEvaluation.strengths.join('; ')}
                    </div>
                  )}
                  {selectedSub.aiEvaluation.gaps.length > 0 && (
                    <div className="text-xs text-amber-800">
                      <strong>Perlu Konfirmasi:</strong>{' '}
                      {selectedSub.aiEvaluation.gaps.join('; ')}
                    </div>
                  )}
                </div>
              )}

              {/* Jawaban Formulir */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
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
                        className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 space-y-1"
                      >
                        <span className="text-[11px] font-semibold text-zinc-500 block">
                          {fieldLabel}
                        </span>
                        <p className="text-xs sm:text-sm text-zinc-900 whitespace-pre-wrap">
                          {display}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Berkas Diunggah */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Berkas Persyaratan ({selectedSub.files.length})
                </h3>
                {selectedSub.files.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    Tidak ada berkas yang diunggah.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedSub.files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-200 bg-zinc-50/50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-zinc-700 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-900 truncate">
                              {file.fieldLabel} — {file.fileName}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {formatBytes(file.size)} • {file.mimeType}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewFile(file)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Pratinjau</span>
                          </button>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
                            title="Buka tab baru"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Keputusan Verifikasi Panitia */}
              <div className="border-t border-zinc-100 pt-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Keputusan &amp; Catatan Panitia
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={reviewStatus}
                    onChange={(e) =>
                      setReviewStatus(e.target.value as SubmissionStatus)
                    }
                    className="px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm bg-white"
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
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 cursor-pointer transition-colors"
                  >
                    {savingReview && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Simpan Keputusan</span>
                  </button>
                </div>

                <textarea
                  rows={2}
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder="Catatan resmi untuk pelamar (tampil di halaman Lacak Pendaftaran)..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* In-App Document Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-900 truncate">
                  {previewFile.fieldLabel} — {previewFile.fileName}
                </p>
                <p className="text-xs text-zinc-500">
                  {formatBytes(previewFile.size)} • {previewFile.mimeType}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Unduh / Tab Baru</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-zinc-100 overflow-auto p-4 flex items-center justify-center min-h-[60vh]">
              {previewFile.mimeType.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewFile.url}
                  alt={previewFile.fileName}
                  className="max-w-full max-h-[75vh] rounded-lg shadow-sm bg-white object-contain"
                />
              ) : previewFile.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.fileName}
                  className="w-full h-[75vh] rounded-lg border border-zinc-200 bg-white"
                />
              ) : (
                <div className="text-center space-y-3 bg-white p-8 rounded-xl border border-zinc-200">
                  <FileText className="w-10 h-10 text-zinc-400 mx-auto" />
                  <p className="text-sm font-semibold text-zinc-800">
                    Pratinjau langsung tidak tersedia untuk format ini.
                  </p>
                  <a
                    href={previewFile.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Unduh Berkas</span>
                  </a>
                </div>
              )}
            </div>
          </div>
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
            <Loader2 className="w-7 h-7 animate-spin text-zinc-900" />
          </div>
        }
      >
        <SubmissionsContent />
      </Suspense>
    </AdminGuard>
  );
}
