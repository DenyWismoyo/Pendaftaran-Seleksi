'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  FolderCheck,
  FolderUp,
  HardDrive,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminClient';
import { connectGoogleDriveOAuth } from '@/lib/driveClientOAuth';
import { cn } from '@/lib/utils';
import {
  DriveAuthMode,
  DriveExportFormat,
  DriveSettings,
  SelectionSubmission,
} from '@/types/selection';

interface GoogleDriveExportModalProps {
  open: boolean;
  onClose: () => void;
  selectedSubmissions: SelectionSubmission[];
  filteredSubmissions: SelectionSubmission[];
  currentFormTitle?: string;
}

interface ExportLogItem {
  submissionId: string;
  applicantName: string;
  registrationCode: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  folderUrl?: string;
  uploadedCount?: number;
}

export default function GoogleDriveExportModal({
  open,
  onClose,
  selectedSubmissions,
  filteredSubmissions,
  currentFormTitle,
}: GoogleDriveExportModalProps) {
  const [scopeMode, setScopeMode] = useState<'selected' | 'filtered'>('filtered');
  const [authMode, setAuthMode] = useState<DriveAuthMode>('oauth');
  const [oauthToken, setOauthToken] = useState('');
  const [oauthEmail, setOauthEmail] = useState('');
  const [connectingOAuth, setConnectingOAuth] = useState(false);

  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [folderInput, setFolderInput] = useState('');
  const [verifiedFolder, setVerifiedFolder] = useState<{
    id: string;
    name: string;
    webViewLink?: string;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [format, setFormat] = useState<DriveExportFormat>('both');
  const [includeFiles, setIncludeFiles] = useState(true);
  const [createBatchSubfolder, setCreateBatchSubfolder] = useState(true);
  const [batchFolderName, setBatchFolderName] = useState('');

  const [exporting, setExporting] = useState(false);
  const [logs, setLogs] = useState<ExportLogItem[]>([]);
  const [targetFolderResult, setTargetFolderResult] = useState<{
    name: string;
    url?: string;
  } | null>(null);
  const abortRef = useRef(false);

  const targetSubmissions = useMemo(
    () => (scopeMode === 'selected' ? selectedSubmissions : filteredSubmissions),
    [scopeMode, selectedSubmissions, filteredSubmissions]
  );

  const loadSettings = useCallback(async () => {
    const res = await adminFetch<{
      settings: DriveSettings;
      serviceAccount: { configured: boolean; clientEmail: string };
    }>('/api/admin/drive/settings');

    if (res.success && res.data) {
      const { settings, serviceAccount } = res.data;
      setServiceAccountEmail(serviceAccount.clientEmail || '');
      if (settings.folderInput || settings.folderId) {
        setFolderInput(settings.folderInput || settings.folderId);
      }
      setAuthMode(settings.authMode || 'oauth');
      setFormat(settings.format || 'both');
      setIncludeFiles(settings.includeFiles ?? true);
      setCreateBatchSubfolder(settings.createBatchSubfolder ?? false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setScopeMode(selectedSubmissions.length > 0 ? 'selected' : 'filtered');
    setVerifiedFolder(null);
    setLogs([]);
    setTargetFolderResult(null);
    abortRef.current = false;

    const today = new Date().toISOString().slice(0, 10);
    const labelPrefix = currentFormTitle
      ? `Kandidat - ${currentFormTitle}`
      : 'Batch Kandidat';
    setBatchFolderName(`${labelPrefix} (${today})`.slice(0, 68));
    loadSettings();
  }, [open, selectedSubmissions.length, currentFormTitle, loadSettings]);

  if (!open) return null;

  const handleConnectOAuth = async () => {
    setConnectingOAuth(true);
    try {
      const { accessToken, email } = await connectGoogleDriveOAuth();
      setOauthToken(accessToken);
      setOauthEmail(email);
      setVerifiedFolder(null);
      toast.success(`Google Drive terhubung (${email}).`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghubungkan Google Drive.');
    } finally {
      setConnectingOAuth(false);
    }
  };

  const handleVerifyFolder = async () => {
    setVerifying(true);
    setVerifiedFolder(null);
    try {
      const res = await adminFetch<{
        id: string;
        name: string;
        webViewLink?: string;
      }>('/api/admin/drive/verify', {
        method: 'POST',
        body: JSON.stringify({
          folderInput: folderInput.trim(),
          authMode,
          driveAccessToken: authMode === 'oauth' ? oauthToken : undefined,
        }),
      });
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Folder gagal diverifikasi.');
      }
      setVerifiedFolder(res.data);
      await adminFetch('/api/admin/drive/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          folderInput: folderInput.trim(),
          folderId: res.data.id,
          folderName: res.data.name,
          authMode,
          format,
          includeFiles,
          createBatchSubfolder,
        }),
      });
      toast.success(`Folder terverifikasi: ${res.data.name}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Verifikasi folder gagal.');
    } finally {
      setVerifying(false);
    }
  };

  const runBatchExport = async (candidatesToRun: SelectionSubmission[]) => {
    if (candidatesToRun.length === 0) {
      toast.error('Tidak ada kandidat untuk diekspor.');
      return;
    }
    if (authMode === 'oauth' && !oauthToken) {
      toast.error('Hubungkan akun Google Drive Anda terlebih dahulu.');
      return;
    }

    abortRef.current = false;
    setExporting(true);
    setTargetFolderResult(null);
    setLogs(
      candidatesToRun.map((s) => ({
        submissionId: s.id,
        applicantName: s.applicantName,
        registrationCode: s.registrationCode,
        status: 'pending',
      }))
    );

    try {
      // 1. Simpan preferensi terakhir & siapkan folder target + file 00-Rekap-Batch
      await adminFetch('/api/admin/drive/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          folderInput: folderInput.trim(),
          authMode,
          format,
          includeFiles,
          createBatchSubfolder,
        }),
      });

      const prepRes = await adminFetch<{
        targetFolderId: string;
        targetFolderName: string;
        targetFolderUrl?: string;
      }>('/api/admin/drive/prepare', {
        method: 'POST',
        body: JSON.stringify({
          folderInput: folderInput.trim(),
          authMode,
          driveAccessToken: authMode === 'oauth' ? oauthToken : undefined,
          createBatchSubfolder,
          batchFolderName: batchFolderName.trim(),
          format,
          submissionIds: candidatesToRun.map((s) => s.id),
        }),
      });

      if (!prepRes.success || !prepRes.data) {
        throw new Error(prepRes.error || 'Gagal menyiapkan folder tujuan Google Drive.');
      }

      const { targetFolderId, targetFolderName, targetFolderUrl } = prepRes.data;
      setTargetFolderResult({ name: targetFolderName, url: targetFolderUrl });

      // 2. Ekspor tiap kandidat satu per satu agar stabil & aman dari timeout
      let okCount = 0;
      let errCount = 0;

      for (const candidate of candidatesToRun) {
        if (abortRef.current) break;

        setLogs((prev) =>
          prev.map((item) =>
            item.submissionId === candidate.id
              ? { ...item, status: 'running', message: 'Mengunggah dossier & berkas...' }
              : item
          )
        );

        const expRes = await adminFetch<{
          folderName: string;
          folderUrl?: string;
          uploadedCount: number;
          attachmentWarnings?: string[];
        }>('/api/admin/drive/export-candidate', {
          method: 'POST',
          body: JSON.stringify({
            submissionId: candidate.id,
            parentFolderId: targetFolderId,
            authMode,
            driveAccessToken: authMode === 'oauth' ? oauthToken : undefined,
            format,
            includeFiles,
          }),
        });

        if (expRes.success && expRes.data) {
          okCount++;
          const warnNote =
            expRes.data.attachmentWarnings && expRes.data.attachmentWarnings.length > 0
              ? ` (${expRes.data.attachmentWarnings.length} lampiran dilewati)`
              : '';
          setLogs((prev) =>
            prev.map((item) =>
              item.submissionId === candidate.id
                ? {
                    ...item,
                    status: 'success',
                    uploadedCount: expRes.data!.uploadedCount,
                    folderUrl: expRes.data!.folderUrl,
                    message: `${expRes.data!.uploadedCount} file tersimpan${warnNote}`,
                  }
                : item
            )
          );
        } else {
          errCount++;
          setLogs((prev) =>
            prev.map((item) =>
              item.submissionId === candidate.id
                ? {
                    ...item,
                    status: 'error',
                    message: expRes.error || 'Gagal mengunggah kandidat ini.',
                  }
                : item
            )
          );
        }
      }

      if (abortRef.current) {
        toast.info(`Ekspor dihentikan. ${okCount} berhasil.`);
      } else if (errCount === 0) {
        toast.success(`Berhasil mengekspor ${okCount} folder kandidat ke Google Drive.`);
      } else {
        toast.warning(`${okCount} berhasil, ${errCount} gagal diekspor ke Google Drive.`);
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Gagal menjalankan ekspor Google Drive.'
      );
    } finally {
      setExporting(false);
    }
  };

  const completedCount = logs.filter((l) => l.status === 'success').length;
  const failedItems = logs.filter((l) => l.status === 'error');
  const progressPct =
    logs.length > 0
      ? Math.round(
          (logs.filter((l) => l.status === 'success' || l.status === 'error').length /
            logs.length) *
            100
        )
      : 0;

  return (
    <div className="ui-modal-backdrop" onClick={() => !exporting && onClose()}>
      <div
        className="ui-modal-panel max-w-3xl max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Export Batch Peserta ke Google Drive
              </h2>
              <p className="text-xs text-zinc-500">
                Buat folder per nama kandidat berisi dokumen `.md`, `.doc`, dan seluruh
                berkas lampiran.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={exporting}
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
          {/* Cakupan Peserta */}
          <div className="space-y-2">
            <label className="ui-label">1. Cakupan Peserta yang Diekspor</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={selectedSubmissions.length === 0 || exporting}
                onClick={() => setScopeMode('selected')}
                className={cn(
                  'text-left p-3 rounded-xl border text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                  scopeMode === 'selected'
                    ? 'border-emerald-600 bg-emerald-50 text-zinc-900'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                )}
              >
                <span className="font-bold block">
                  Kandidat Terpilih ({selectedSubmissions.length})
                </span>
                <span className="text-zinc-500">
                  Hanya peserta yang Anda centang di daftar
                </span>
              </button>

              <button
                type="button"
                disabled={exporting}
                onClick={() => setScopeMode('filtered')}
                className={cn(
                  'text-left p-3 rounded-xl border text-xs transition-colors cursor-pointer',
                  scopeMode === 'filtered'
                    ? 'border-emerald-600 bg-emerald-50 text-zinc-900'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                )}
              >
                <span className="font-bold block">
                  Semua Hasil Filter ({filteredSubmissions.length})
                </span>
                <span className="text-zinc-500">
                  Seluruh peserta sesuai filter status &amp; program saat ini
                </span>
              </button>
            </div>
          </div>

          {/* Koneksi Google Drive */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                2. Metode Akses Google Drive
              </label>
              <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 bg-white text-xs font-semibold">
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => {
                    setAuthMode('oauth');
                    setVerifiedFolder(null);
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md cursor-pointer',
                    authMode === 'oauth'
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:text-zinc-900'
                  )}
                >
                  Akun Google Saya (OAuth)
                </button>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => {
                    setAuthMode('service_account');
                    setVerifiedFolder(null);
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md cursor-pointer',
                    authMode === 'service_account'
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:text-zinc-900'
                  )}
                >
                  Shared Drive (Service Account)
                </button>
              </div>
            </div>

            {authMode === 'oauth' ? (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200 rounded-lg p-3">
                <div className="text-xs">
                  {oauthToken ? (
                    <span className="text-emerald-800 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Terhubung ke Google Drive: {oauthEmail}
                    </span>
                  ) : (
                    <span className="text-zinc-600">
                      Hubungkan akun Google Anda (My Drive atau Workspace) agar unggahan
                      file memakai kuota akun Google Anda.
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={connectingOAuth || exporting}
                  onClick={handleConnectOAuth}
                  className="ui-btn-primary py-1.5 px-3 text-xs shrink-0"
                >
                  {connectingOAuth ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>{oauthToken ? 'Ganti Akun Google' : 'Hubungkan Google Drive'}</span>
                </button>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 space-y-2">
                <p>
                  Mode <strong>Service Account</strong> cocok untuk folder{' '}
                  <strong>Google Workspace Shared Drive</strong>. Pastikan folder tujuan
                  sudah di-share (peran <em>Pengelola Konten / Editor</em>) ke alamat:
                </p>
                {serviceAccountEmail && (
                  <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-md px-2.5 py-1.5">
                    <code className="font-mono text-[11px] flex-1 truncate text-zinc-800">
                      {serviceAccountEmail}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(serviceAccountEmail);
                        toast.success('Email Service Account disalin.');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                      Salin
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Folder ID / URL */}
            <div className="space-y-1.5 pt-1">
              <label className="ui-label">
                URL atau ID Folder Google Drive Tujuan{' '}
                {authMode === 'oauth' && (
                  <span className="font-normal text-zinc-500">
                    (opsional — kosongkan untuk membuat folder otomatis di My Drive)
                  </span>
                )}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  disabled={exporting}
                  value={folderInput}
                  onChange={(e) => {
                    setFolderInput(e.target.value);
                    setVerifiedFolder(null);
                  }}
                  placeholder="https://drive.google.com/drive/folders/1AbCdEfGhIjK..."
                  className="ui-input font-mono text-xs flex-1 bg-white"
                />
                <button
                  type="button"
                  disabled={verifying || exporting}
                  onClick={handleVerifyFolder}
                  className="ui-btn-secondary py-2 px-3 text-xs shrink-0"
                >
                  {verifying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FolderCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Cek Akses Folder</span>
                </button>
              </div>
              {verifiedFolder && (
                <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Folder siap: <strong>{verifiedFolder.name}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Opsi Format & Susunan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="ui-label">3. Format Biodata &amp; Kelengkapan Berkas</label>
              <select
                disabled={exporting}
                value={format}
                onChange={(e) => setFormat(e.target.value as DriveExportFormat)}
                className="ui-input text-xs bg-white"
              >
                <option value="both">Keduanya: Markdown (.md) + Word (.doc)</option>
                <option value="doc">Hanya Microsoft Word (.doc)</option>
                <option value="md">Hanya Markdown (.md)</option>
              </select>

              <label className="flex items-start gap-2 text-xs text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={exporting}
                  checked={includeFiles}
                  onChange={(e) => setIncludeFiles(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>
                  <strong>Sertakan seluruh file upload peserta</strong> (KTP, CV,
                  Ijazah, Makalah, dll.) ke dalam folder masing-masing peserta
                </span>
              </label>

              <label className="flex items-start gap-2 text-xs text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={exporting}
                  checked={createBatchSubfolder}
                  onChange={(e) => setCreateBatchSubfolder(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span>Buat subfolder khusus batch di dalam folder tujuan</span>
              </label>

              {createBatchSubfolder && (
                <input
                  type="text"
                  disabled={exporting}
                  value={batchFolderName}
                  onChange={(e) => setBatchFolderName(e.target.value)}
                  placeholder="Nama subfolder batch"
                  className="ui-input text-xs bg-white"
                />
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Pratinjau Susunan Folder di Drive
              </p>
              <pre className="text-[11px] font-mono text-zinc-700 leading-relaxed overflow-x-auto whitespace-pre">
{`${createBatchSubfolder ? `📁 ${batchFolderName || 'Batch Kandidat'}` : '📁 [Folder Tujuan]'}
├── 📄 00-Rekap-Batch-Kandidat (.md / .doc)
└── 📁 Nama Kandidat - SEL-2026-XXXXXX
    ├── 📄 01-Biodata-dan-Jawaban-Nama.md
    ├── 📄 01-Biodata-dan-Jawaban-Nama.doc
    ├── 📎 02-Scan e-KTP - ktp.pdf
    └── 📎 03-CV & Lampiran lainnya`}
              </pre>
            </div>
          </div>

          {/* Progress & Logs */}
          {logs.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-zinc-800">
                  Progres Ekspor: {completedCount} / {logs.length} kandidat ({progressPct}%)
                </div>
                {targetFolderResult?.url && (
                  <a
                    href={targetFolderResult.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
                  >
                    Buka Folder "{targetFolderResult.name}"
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-zinc-100 text-xs">
                {logs.map((item) => (
                  <div
                    key={item.submissionId}
                    className="py-2 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 truncate">
                        {item.applicantName}{' '}
                        <span className="font-mono text-[11px] text-zinc-500">
                          ({item.registrationCode})
                        </span>
                      </p>
                      {item.message && (
                        <p
                          className={cn(
                            'text-[11px] truncate',
                            item.status === 'error' ? 'text-rose-600' : 'text-zinc-500'
                          )}
                        >
                          {item.message}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {item.status === 'running' && (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                      )}
                      {item.status === 'success' && (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          {item.folderUrl && (
                            <a
                              href={item.folderUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-semibold text-emerald-700 hover:underline"
                            >
                              Buka
                            </a>
                          )}
                        </>
                      )}
                      {item.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-2 bg-zinc-50">
          <div className="text-xs text-zinc-500">
            Siap diekspor: <strong>{targetSubmissions.length} kandidat</strong>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {exporting ? (
              <button
                type="button"
                onClick={() => {
                  abortRef.current = true;
                }}
                className="ui-btn-secondary text-rose-700 border-rose-200 hover:bg-rose-50 text-xs"
              >
                Hentikan Ekspor
              </button>
            ) : (
              <>
                {failedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const retryIds = new Set(failedItems.map((i) => i.submissionId));
                      runBatchExport(
                        targetSubmissions.filter((s) => retryIds.has(s.id))
                      );
                    }}
                    className="ui-btn-secondary text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Ulangi yang Gagal ({failedItems.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="ui-btn-secondary text-xs"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={targetSubmissions.length === 0}
                  onClick={() => runBatchExport(targetSubmissions)}
                  className="ui-btn-primary text-xs"
                >
                  <FolderUp className="w-4 h-4" />
                  <span>Mulai Export ke Google Drive</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

