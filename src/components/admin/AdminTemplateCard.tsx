'use client';

import { Download, Edit3, Eye, Globe, Lock, Trash2 } from 'lucide-react';
import { DocumentTemplateRecord, SelectionForm } from '@/types/selection';

interface AdminTemplateCardProps {
  template: DocumentTemplateRecord;
  formsMap: Map<string, SelectionForm>;
  onPreview: (tpl: DocumentTemplateRecord) => void;
  onEdit: (tpl: DocumentTemplateRecord) => void;
  onDelete: (tpl: DocumentTemplateRecord) => void;
  onDownloadWord: (tpl: DocumentTemplateRecord) => void;
}

export default function AdminTemplateCard({
  template,
  formsMap,
  onPreview,
  onEdit,
  onDelete,
  onDownloadWord,
}: AdminTemplateCardProps) {
  const assignedForms = (template.formIds || [])
    .map((fid) => formsMap.get(fid))
    .filter((f): f is SelectionForm => Boolean(f));

  return (
    <div className="ui-card p-5 flex flex-col justify-between gap-4 hover:border-zinc-300 transition-colors">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            {template.category}
          </span>

          {template.isGlobal ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Globe className="w-3 h-3" />
              Global
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700">
              <Lock className="w-3 h-3" />
              Terisolasi ({template.formIds?.length || 0} seleksi)
            </span>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold text-zinc-900 leading-snug">
            {template.title}
          </h3>
          {template.targetFieldHint && (
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              {template.targetFieldHint}
            </p>
          )}
          <p className="text-xs text-zinc-600 mt-1.5 line-clamp-2">
            {template.description || 'Belum ada deskripsi.'}
          </p>
        </div>

        <div className="pt-1 flex flex-wrap gap-1.5">
          {assignedForms.length > 0 ? (
            assignedForms.map((f) => (
              <span
                key={f.id}
                className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 truncate max-w-full"
                title={f.title}
              >
                {f.title}
              </span>
            ))
          ) : !template.isGlobal ? (
            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              Belum di-bind ke formulir seleksi mana pun
            </span>
          ) : null}
        </div>
      </div>

      <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onEdit(template)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit & Isolasi
        </button>

        <button
          type="button"
          onClick={() => onPreview(template)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          Pratinjau
        </button>

        <button
          type="button"
          onClick={() => onDownloadWord(template)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          .doc
        </button>

        <button
          type="button"
          onClick={() => onDelete(template)}
          className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium cursor-pointer"
          title="Hapus template"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
