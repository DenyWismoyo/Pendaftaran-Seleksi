'use client';

import { Eye, FileText, FileUp, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { SelectionField, UploadedFileMeta } from '@/types/selection';

interface WizardDynamicFieldsProps {
  fields: SelectionField[];
  answers: Record<string, string | number | boolean | string[]>;
  files: UploadedFileMeta[];
  uploadingFields: Record<string, boolean>;
  dragActiveField: string | null;
  fieldErrors: Record<string, string>;
  onAnswerChange: (
    fieldId: string,
    value: string | number | boolean | string[]
  ) => void;
  onCheckboxToggle: (fieldId: string, option: string) => void;
  onFileUpload: (field: SelectionField, file: File) => void;
  onRemoveFile: (fieldId: string) => void;
  onOpenPreview: (file: UploadedFileMeta) => void;
  onDragActiveChange: (fieldId: string | null) => void;
}

export default function WizardDynamicFields({
  fields,
  answers,
  files,
  uploadingFields,
  dragActiveField,
  fieldErrors,
  onAnswerChange,
  onCheckboxToggle,
  onFileUpload,
  onRemoveFile,
  onOpenPreview,
  onDragActiveChange,
}: WizardDynamicFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {fields.map((field) => {
        const err = fieldErrors[field.id];
        const uploadedFile = files.find((f) => f.fieldId === field.id);
        const isUploading = Boolean(uploadingFields[field.id]);
        const isDragging = dragActiveField === field.id;
        const isImage = uploadedFile?.mimeType.startsWith('image/');
        const colSpan = field.width === 'half' ? 'sm:col-span-1' : 'sm:col-span-2';
        const strVal = String(answers[field.id] ?? '');
        const isNikField = /nik|nomor induk kependudukan/i.test(field.label);
        const digitLen = strVal.replace(/\D/g, '').length;
        const wordCount = strVal.trim() ? strVal.trim().split(/\s+/).length : 0;

        return (
          <div key={field.id} className={cn('space-y-1.5', colSpan)}>
            <label className="text-sm font-semibold text-zinc-800 block">
              {field.label}{' '}
              {field.required && <span className="text-rose-500">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-zinc-500">{field.description}</p>
            )}

            {field.type === 'textarea' && (
              <div className="space-y-1">
                <textarea
                  rows={4}
                  value={strVal}
                  onChange={(e) => onAnswerChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="ui-input"
                />
                <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                  <span>{wordCount} kata</span>
                  <span>{strVal.length} karakter</span>
                </div>
              </div>
            )}

            {['text', 'email', 'tel', 'number', 'date'].includes(field.type) && (
              <div className="space-y-1">
                <input
                  type={field.type}
                  value={strVal}
                  onChange={(e) => onAnswerChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="ui-input"
                />
                {isNikField && (
                  <p
                    className={cn(
                      'text-[11px] font-mono',
                      digitLen === 16
                        ? 'text-emerald-700 font-semibold'
                        : digitLen > 0
                          ? 'text-amber-700'
                          : 'text-zinc-400'
                    )}
                  >
                    {digitLen === 16
                      ? '16/16 digit NIK valid'
                      : `${digitLen}/16 digit NIK`}
                  </p>
                )}
              </div>
            )}

            {field.type === 'select' && (
              <select
                value={strVal}
                onChange={(e) => onAnswerChange(field.id, e.target.value)}
                className="ui-input bg-white"
              >
                <option value="">-- Pilih Opsi --</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {field.type === 'radio' && (
              <div className="space-y-2 pt-1">
                {field.options.map((opt) => (
                  <label
                    key={opt}
                    className={cn(
                      'flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-sm transition-colors',
                      answers[field.id] === opt
                        ? 'border-zinc-900 bg-zinc-50 font-semibold'
                        : 'border-zinc-200 hover:bg-zinc-50'
                    )}
                  >
                    <input
                      type="radio"
                      name={field.id}
                      checked={answers[field.id] === opt}
                      onChange={() => onAnswerChange(field.id, opt)}
                      className="accent-zinc-900"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {field.type === 'checkbox' && (
              <div className="space-y-2 pt-1">
                {field.options.map((opt) => {
                  const selected = Array.isArray(answers[field.id])
                    ? (answers[field.id] as string[]).includes(opt)
                    : false;
                  return (
                    <label
                      key={opt}
                      className={cn(
                        'flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-sm transition-colors',
                        selected
                          ? 'border-zinc-900 bg-zinc-50 font-semibold'
                          : 'border-zinc-200 hover:bg-zinc-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onCheckboxToggle(field.id, opt)}
                        className="rounded accent-zinc-900"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {field.type === 'file' && (
              <div className="pt-1 space-y-2">
                {uploadedFile ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70">
                    <div className="flex items-center gap-3 min-w-0">
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={uploadedFile.url}
                          alt={uploadedFile.fileName}
                          className="w-12 h-12 rounded-lg object-cover border border-emerald-200 shrink-0 bg-white cursor-pointer"
                          onClick={() => onOpenPreview(uploadedFile)}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white border border-emerald-200 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-emerald-700" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onOpenPreview(uploadedFile)}
                          className="text-sm font-semibold text-emerald-950 hover:underline truncate block text-left max-w-full cursor-pointer"
                        >
                          {uploadedFile.fileName}
                        </button>
                        <span className="text-xs text-emerald-700">
                          {formatBytes(uploadedFile.size)} • Tersimpan sementara
                          (aman diganti sebelum kirim)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenPreview(uploadedFile)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-200 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Pratinjau</span>
                      </button>

                      <label
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer',
                          isUploading && 'opacity-60 pointer-events-none'
                        )}
                      >
                        {isUploading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>Ganti</span>
                        <input
                          type="file"
                          accept={field.accept || '.pdf,.jpg,.jpeg,.png'}
                          disabled={isUploading}
                          className="hidden"
                          onChange={(e) => {
                            const picked = e.target.files?.[0];
                            if (picked) onFileUpload(field, picked);
                            e.target.value = '';
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => onRemoveFile(field.id)}
                        disabled={isUploading}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                        title="Hapus berkas sementara"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      onDragActiveChange(field.id);
                    }}
                    onDragLeave={() => onDragActiveChange(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      onDragActiveChange(null);
                      const dropped = e.dataTransfer.files?.[0];
                      if (dropped && !isUploading) onFileUpload(field, dropped);
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-colors cursor-pointer text-center',
                      isDragging
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-zinc-300 bg-zinc-50 hover:border-zinc-500 hover:bg-zinc-100/70'
                    )}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-800" />
                        <span className="text-xs font-semibold text-zinc-700">
                          Mengunggah berkas sementara...
                        </span>
                      </>
                    ) : (
                      <>
                        <FileUp className="w-6 h-6 text-zinc-400" />
                        <div>
                          <span className="text-sm font-semibold text-zinc-900">
                            Klik atau seret berkas ke area ini
                          </span>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Format: {field.accept || '.pdf,.jpg,.png'} • Maks.{' '}
                            {field.maxSizeMB || 5} MB (foto besar otomatis dikompresi)
                          </p>
                        </div>
                      </>
                    )}
                    <input
                      type="file"
                      accept={field.accept || '.pdf,.jpg,.jpeg,.png'}
                      disabled={isUploading}
                      className="hidden"
                      onChange={(e) => {
                        const picked = e.target.files?.[0];
                        if (picked) onFileUpload(field, picked);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            )}

            {err && <p className="text-xs font-medium text-rose-600">{err}</p>}
          </div>
        );
      })}
    </div>
  );
}

