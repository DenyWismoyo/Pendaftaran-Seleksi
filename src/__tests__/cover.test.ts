import { describe, expect, it } from 'vitest';
import { hasFormCoverContent } from '@/lib/formCover';
import { SelectionFormInputSchema } from '@/types/selection';

describe('Form Cover Pembuka & Lampiran Pengumuman', () => {
  it('returns false when showCover is explicitly disabled even if cover content exists', () => {
    expect(
      hasFormCoverContent({
        showCover: false,
        coverSummary: 'Pengumuman resmi',
        coverHighlights: ['Jadwal seleksi'],
        coverImage: null,
        coverAttachments: [],
      })
    ).toBe(false);
  });

  it('returns true when showCover is enabled or cover media/attachments exist', () => {
    expect(
      hasFormCoverContent({
        showCover: undefined,
        coverSummary: '',
        coverTitle: '',
        coverHighlights: [],
        coverImage: null,
        coverAttachments: [
          {
            id: 'cov_1',
            title: 'Pengumuman Seleksi PDF',
            fileName: 'pengumuman.pdf',
            mimeType: 'application/pdf',
            size: 12000,
            url: 'https://example.com/pengumuman.pdf',
            storagePath: 'selection_cover_assets/form1/cover-attachment/pengumuman.pdf',
          },
        ],
      })
    ).toBe(true);

    expect(
      hasFormCoverContent({
        showCover: undefined,
        coverSummary: '',
        coverTitle: '',
        coverHighlights: [],
        coverImage: null,
        coverAttachments: [],
      })
    ).toBe(false);
  });

  it('validates SelectionFormInputSchema with coverImage and coverAttachments', () => {
    const parsed = SelectionFormInputSchema.safeParse({
      title: 'Seleksi Pejabat Teknis Solo Technopark',
      slug: 'seleksi-pejabat-teknis',
      category: 'Rekrutmen',
      description: 'Deskripsi program',
      showCover: true,
      coverTitle: 'Selamat Datang Peserta Seleksi',
      coverSummary: 'Unduh pengumuman resmi sebelum mengisi formulir.',
      coverHighlights: ['Batas akhir 30 November', 'Siapkan PDF'],
      coverImage: {
        fileName: 'banner.webp',
        mimeType: 'image/webp',
        size: 54000,
        url: 'https://example.com/banner.webp',
        storagePath: 'selection_cover_assets/test/cover-image/banner.webp',
      },
      coverAttachments: [
        {
          id: 'att1',
          title: 'PDF Pengumuman Resmi',
          fileName: 'pengumuman.pdf',
          mimeType: 'application/pdf',
          size: 102400,
          url: 'https://example.com/pengumuman.pdf',
          storagePath: 'selection_cover_assets/test/cover-attachment/pengumuman.pdf',
        },
      ],
      coverCtaLabel: 'Mulai Daftar',
      fields: [
        {
          id: 'nik',
          label: 'NIK',
          type: 'text',
          required: true,
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});

