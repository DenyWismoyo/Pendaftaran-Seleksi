'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  BookmarkCheck,
  Cloud,
  CloudOff,
  FolderOpen,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { SyncState } from '@/components/seleksi/types';

interface DraftSyncToolbarProps {
  isClosed: boolean;
  syncState: SyncState;
  draftToken: string;
  lastSyncedAt: string | null;
  hasAnyProgress: boolean;
  onOpenRestore: () => void;
  onSaveLater: () => void;
  onReset: () => void;
}

export default function DraftSyncToolbar({
  isClosed,
  syncState,
  draftToken,
  lastSyncedAt,
  hasAnyProgress,
  onOpenRestore,
  onSaveLater,
  onReset,
}: DraftSyncToolbarProps) {
  return (
    <div className="ui-mobile-pad flex flex-wrap items-center justify-between gap-3">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Daftar Seleksi</span>
      </Link>

      {!isClosed && (
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-2 text-xs bg-white border border-zinc-200 px-3 py-1.5 rounded-xl text-zinc-600"
            title={
              lastSyncedAt
                ? `Terakhir sinkron: ${new Date(lastSyncedAt).toLocaleTimeString('id-ID')}`
                : 'Draf otomatis disimpan'
            }
          >
            {syncState === 'saving' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-700" />
                <span>Menyimpan...</span>
              </>
            ) : syncState === 'saved' ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-700" />
                <span className="text-emerald-800 font-medium">
                  Tersimpan • <span className="font-mono">{draftToken}</span>
                </span>
              </>
            ) : syncState === 'local' ? (
              <>
                <CloudOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-amber-800">
                  Draf lokal • <span className="font-mono">{draftToken}</span>
                </span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  Kode Draf:{' '}
                  <span className="font-mono font-semibold">{draftToken || '...'}</span>
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenRestore}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Punya Kode Draf?</span>
          </button>

          <button
            type="button"
            onClick={onSaveLater}
            disabled={syncState === 'saving'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-60"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>Simpan &amp; Lanjutkan Nanti</span>
          </button>

          {hasAnyProgress && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
              title="Bersihkan seluruh isian draf"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

