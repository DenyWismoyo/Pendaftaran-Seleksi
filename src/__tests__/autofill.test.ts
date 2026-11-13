import { describe, expect, it } from 'vitest';
import {
  getAllAutofillableTargets,
  getEffectiveFileAutofillTargets,
  getRecommendedSourceFilesForForm,
  suggestAutofillTargetsForFileField,
} from '@/lib/autofillMapper';
import { SelectionField } from '@/types/selection';

const mockFields: SelectionField[] = [
  {
    id: 'nik',
    label: 'NIK KTP',
    type: 'text',
    required: true,
    placeholder: '',
    description: '',
    section: 'Data Pribadi',
    options: [],
    accept: '.pdf',
    maxSizeMB: 5,
    width: 'half',
  },
  {
    id: 'alamatDomisili',
    label: 'Alamat Domisili Saat Ini',
    type: 'textarea',
    required: true,
    placeholder: '',
    description: '',
    section: 'Data Pribadi',
    options: [],
    accept: '.pdf',
    maxSizeMB: 5,
    width: 'full',
  },
  {
    id: 'pendidikanTerakhir',
    label: 'Jenjang Pendidikan Terakhir',
    type: 'select',
    required: true,
    placeholder: '',
    description: '',
    section: 'Pendidikan',
    options: ['S1', 'S2', 'S3'],
    accept: '.pdf',
    maxSizeMB: 5,
    width: 'half',
  },
  {
    id: 'perguruanTinggi',
    label: 'Nama Universitas / Perguruan Tinggi',
    type: 'text',
    required: true,
    placeholder: '',
    description: '',
    section: 'Pendidikan',
    options: [],
    accept: '.pdf',
    maxSizeMB: 5,
    width: 'half',
  },
  {
    id: 'ringkasanGagasan',
    label: 'Ringkasan Makalah Gagasan & Inovasi',
    type: 'textarea',
    required: true,
    placeholder: '',
    description: '',
    section: 'Gagasan',
    options: [],
    accept: '.pdf',
    maxSizeMB: 5,
    width: 'full',
  },
  {
    id: 'fileKtp',
    label: 'Scan KTP Asli',
    type: 'file',
    required: true,
    placeholder: '',
    description: '',
    section: 'Berkas Persyaratan',
    options: [],
    accept: '.pdf,.jpg,.png',
    maxSizeMB: 5,
    width: 'half',
  },
  {
    id: 'fileIjazah',
    label: 'Scan Ijazah & Transkrip Nilai',
    type: 'file',
    required: true,
    placeholder: '',
    description: '',
    section: 'Berkas Persyaratan',
    options: [],
    accept: '.pdf',
    maxSizeMB: 5,
    width: 'half',
  },
  {
    id: 'fileCv',
    label: 'Daftar Riwayat Hidup (CV)',
    type: 'file',
    required: true,
    placeholder: '',
    description: '',
    section: 'Berkas Persyaratan',
    options: [],
    accept: '.pdf',
    maxSizeMB: 5,
    width: 'half',
  },
  {
    id: 'fileMakalah',
    label: 'Dokumen Makalah Visi & Program Kerja',
    type: 'file',
    required: true,
    placeholder: '',
    description: '',
    section: 'Berkas Persyaratan',
    options: [],
    accept: '.pdf',
    maxSizeMB: 5,
    width: 'full',
  },
];

describe('Smart Document-to-Form Autofill Mapper', () => {
  it('excludes file fields from autofill targets and includes identity targets', () => {
    const targets = getAllAutofillableTargets(mockFields);
    const ids = targets.map((t) => t.id);
    expect(ids).toContain('__identity_name');
    expect(ids).toContain('__identity_email');
    expect(ids).toContain('__identity_phone');
    expect(ids).toContain('nik');
    expect(ids).not.toContain('fileKtp');
  });

  it('automatically suggests relevant targets for KTP, Ijazah, CV, and Makalah', () => {
    const ktpTargets = suggestAutofillTargetsForFileField(mockFields[5], mockFields);
    expect(ktpTargets).toContain('__identity_name');
    expect(ktpTargets).toContain('nik');
    expect(ktpTargets).toContain('alamatDomisili');
    expect(ktpTargets).not.toContain('ringkasanGagasan');

    const ijazahTargets = suggestAutofillTargetsForFileField(mockFields[6], mockFields);
    expect(ijazahTargets).toContain('__identity_name');
    expect(ijazahTargets).toContain('pendidikanTerakhir');
    expect(ijazahTargets).toContain('perguruanTinggi');

    const cvTargets = suggestAutofillTargetsForFileField(mockFields[7], mockFields);
    expect(cvTargets).toContain('__identity_email');
    expect(cvTargets).toContain('__identity_phone');
    expect(cvTargets).toContain('pendidikanTerakhir');

    const makalahTargets = suggestAutofillTargetsForFileField(mockFields[8], mockFields);
    expect(makalahTargets).toContain('ringkasanGagasan');
  });

  it('respects form.enableAiAutofill and per-field autofillMode (off/custom/auto)', () => {
    const ktpField = mockFields[5];
    expect(
      getEffectiveFileAutofillTargets(ktpField, {
        enableAiAutofill: false,
        fields: mockFields,
      })
    ).toEqual([]);

    expect(
      getEffectiveFileAutofillTargets(
        { ...ktpField, autofillMode: 'off' },
        { enableAiAutofill: true, fields: mockFields }
      )
    ).toEqual([]);

    const custom = getEffectiveFileAutofillTargets(
      { ...ktpField, autofillMode: 'custom', autofillTargets: ['nik'] },
      { enableAiAutofill: true, fields: mockFields }
    );
    expect(custom.map((t) => t.id)).toEqual(['nik']);
  });

  it('orders recommended source files by descending target coverage', () => {
    const rec = getRecommendedSourceFilesForForm({
      enableAiAutofill: true,
      fields: mockFields,
    });
    expect(rec.length).toBeGreaterThanOrEqual(3);
    expect(rec[0].field.id).toBe('fileCv');
    for (let i = 1; i < rec.length; i++) {
      expect(rec[i - 1].targets.length).toBeGreaterThanOrEqual(rec[i].targets.length);
    }
  });
});

