import { describe, expect, it } from 'vitest';
import {
  filterTemplatesForForm,
  normalizeStaticTemplates,
} from '@/lib/templateScope';
import {
  DocumentTemplateInputSchema,
  DocumentTemplateRecord,
} from '@/types/selection';

function makeTemplate(
  overrides: Partial<DocumentTemplateRecord>
): DocumentTemplateRecord {
  return {
    id: 'tpl-default',
    slug: 'tpl-default',
    title: 'Template Default',
    category: 'Umum',
    targetFieldHint: 'Kolom Upload',
    description: 'Deskripsi singkat',
    fileBaseName: 'template-default',
    markdown: '# Judul Template\n\nIsi dokumen yang memadai.',
    formIds: [],
    isGlobal: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('filterTemplatesForForm', () => {
  const templates: DocumentTemplateRecord[] = [
    makeTemplate({
      id: 'tpl-lamaran-pt',
      slug: 'surat-lamaran-pejabat-teknis',
      title: 'Surat Lamaran Pejabat Teknis',
      category: 'Pejabat Teknis',
      formIds: ['form-pt'],
    }),
    makeTemplate({
      id: 'tpl-cv',
      slug: 'daftar-riwayat-hidup-cv',
      title: 'Daftar Riwayat Hidup (CV)',
      category: 'Umum',
      isGlobal: true,
    }),
    makeTemplate({
      id: 'tpl-vokasi',
      slug: 'surat-pernyataan-pelatihan-vokasi',
      title: 'Surat Pernyataan Pelatihan Vokasi',
      category: 'Pelatihan Vokasi',
      formIds: ['form-vokasi'],
    }),
    makeTemplate({
      id: 'tpl-magang',
      slug: 'surat-permohonan-magang-pkl',
      title: 'Surat Permohonan Magang / PKL',
      category: 'Magang & PKL',
      formIds: ['form-magang'],
    }),
  ];

  it('mengisolasi secara ketat berdasarkan documentTemplateIds pada formulir', () => {
    const result = filterTemplatesForForm(templates, {
      id: 'form-pt',
      slug: 'seleksi-pejabat-teknis-pelayanan-solo-technopark',
      title: 'Seleksi Pejabat Teknis Pelayanan BLUD',
      category: 'Karier & Rekrutmen',
      documentTemplateIds: ['tpl-lamaran-pt', 'daftar-riwayat-hidup-cv'],
    });

    expect(result.map((t) => t.id)).toEqual(['tpl-lamaran-pt', 'tpl-cv']);
    expect(result.some((t) => t.id === 'tpl-vokasi')).toBe(false);
    expect(result.some((t) => t.id === 'tpl-magang')).toBe(false);
  });

  it('memprioritaskan formIds + template global jika documentTemplateIds belum diset', () => {
    const result = filterTemplatesForForm(templates, {
      id: 'form-vokasi',
      slug: 'pelatihan-las-smk',
      title: 'Pelatihan Vokasi Pengelasan',
      category: 'Pelatihan Vokasi',
    });

    expect(result.map((t) => t.id)).toEqual(['tpl-vokasi', 'tpl-cv']);
  });

  it('menggunakan heuristik kategori untuk data statis bawaan yang belum terikat form', () => {
    const staticTpls = normalizeStaticTemplates();
    const result = filterTemplatesForForm(staticTpls, {
      id: 'form-legacy-pt',
      slug: 'seleksi-pejabat-teknis-pelayanan',
      title: 'Seleksi Pejabat Teknis Pelayanan',
      category: 'Karier & Rekrutmen',
    });

    const slugs = result.map((t) => t.slug);
    expect(slugs).toContain('surat-lamaran-pejabat-teknis');
    expect(slugs).toContain('daftar-riwayat-hidup-cv');
    expect(slugs).not.toContain('surat-pernyataan-pelatihan-vokasi');
    expect(slugs).not.toContain('surat-permohonan-magang-pkl');
  });
});

describe('DocumentTemplateInputSchema', () => {
  it('menerima payload valid dengan nilai default opsional', () => {
    const parsed = DocumentTemplateInputSchema.safeParse({
      slug: 'surat-keterangan-sehat',
      title: 'Surat Keterangan Sehat Jasmani',
      fileBaseName: 'surat-keterangan-sehat',
      markdown: '# SURAT KETERANGAN\n\nYang bertanda tangan di bawah ini menyatakan sehat.',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.formIds).toEqual([]);
      expect(parsed.data.isGlobal).toBe(false);
    }
  });

  it('menolak markdown atau judul yang terlalu pendek', () => {
    const parsed = DocumentTemplateInputSchema.safeParse({
      slug: 'ab',
      title: 'ab',
      fileBaseName: 'ab',
      markdown: 'pendek',
    });
    expect(parsed.success).toBe(false);
  });
});
