import { callGeminiLite, extractJsonFromAi, GeminiPart } from '@/lib/gemini';
import { getAdminBucket } from '@/lib/firebaseAdmin';
import { AiEvaluation, SelectionForm, SelectionSubmission } from '@/types/selection';

const SUPPORTED_DOC_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_INLINE_DOC_BYTES = 2 * 1024 * 1024; // 2 MB per berkas untuk pemeriksaan cepat

async function loadDocumentPartsForEvaluation(
  submission: Pick<SelectionSubmission, 'files'>
): Promise<{ parts: GeminiPart[]; inspectedLabels: string[] }> {
  const parts: GeminiPart[] = [];
  const inspectedLabels: string[] = [];

  if (!submission.files || submission.files.length === 0) {
    return { parts, inspectedLabels };
  }

  let bucket: ReturnType<typeof getAdminBucket> | null = null;
  try {
    bucket = getAdminBucket();
  } catch {
    return { parts, inspectedLabels };
  }

  const candidates = submission.files
    .filter(
      (f) =>
        f.storagePath &&
        SUPPORTED_DOC_MIME_TYPES.has(f.mimeType) &&
        f.size > 0 &&
        f.size <= MAX_INLINE_DOC_BYTES
    )
    .slice(0, 2);

  for (const fileMeta of candidates) {
    try {
      const [buffer] = await bucket.file(fileMeta.storagePath).download();
      if (buffer.byteLength <= MAX_INLINE_DOC_BYTES) {
        parts.push({
          text: `[Lampiran Dokumen untuk diperiksa: ${fileMeta.fieldLabel} (${fileMeta.fileName})]`,
        });
        parts.push({
          inlineData: {
            mimeType:
              fileMeta.mimeType === 'image/jpg' ? 'image/jpeg' : fileMeta.mimeType,
            data: buffer.toString('base64'),
          },
        });
        inspectedLabels.push(fileMeta.fieldLabel);
      }
    } catch {
      // Lewati jika gagal mengunduh berkas; evaluasi tetap berjalan dari metadata & jawaban
    }
  }

  return { parts, inspectedLabels };
}

export async function evaluateSubmissionWithAi(
  form: SelectionForm,
  submission: Pick<
    SelectionSubmission,
    'applicantName' | 'applicantEmail' | 'answers' | 'files'
  >
): Promise<AiEvaluation> {
  const fieldAnswersSummary = form.fields.map((field) => {
    if (field.type === 'file') {
      const file = submission.files.find((f) => f.fieldId === field.id);
      return `- ${field.label}: ${file ? `Terunggah (${file.fileName})` : 'Tidak ada berkas'}`;
    }
    const raw = submission.answers[field.id];
    const display = Array.isArray(raw) ? raw.join(', ') : String(raw ?? '-');
    return `- ${field.label}: ${display}`;
  });

  const { parts: documentParts, inspectedLabels } =
    await loadDocumentPartsForEvaluation(submission);

  const prompt = `Anda adalah Ketua Panitia Seleksi Administrasi & Kompetensi.
Evaluasi data pendaftaran berikut secara objektif, ringkas, dan dalam Bahasa Indonesia.
${
  inspectedLabels.length > 0
    ? `Dokumen terlampir yang berhasil dibaca isinya: ${inspectedLabels.join(', ')}. Periksa kesesuaian nama/isi dokumen terhadap isian formulir.`
    : ''
}

Program Seleksi: ${form.title}
Kategori: ${form.category}
Kriteria Khusus Panitia: ${form.aiCriteria || 'Kelengkapan data, relevansi latar belakang, motivasi, dan kelengkapan berkas.'}

Data Pelamar:
- Nama: ${submission.applicantName}
- Email: ${submission.applicantEmail}
${fieldAnswersSummary.join('\n')}

Kembalikan HANYA JSON valid (tanpa teks tambahan) dengan struktur persis berikut:
{
  "score": number (0-100),
  "summary": "Ringkasan penilaian 2-3 kalimat",
  "strengths": ["Poin keunggulan 1", "Poin keunggulan 2"],
  "gaps": ["Kekurangan atau hal yang perlu dikonfirmasi 1"],
  "recommendation": "DIREKOMENDASIKAN" | "PERLU_TINJAUAN" | "KURANG_SESUAI"
}`;

  const rawAi = await callGeminiLite({
    parts: [{ text: prompt }, ...documentParts],
    temperature: 0.2,
    maxOutputTokens: 1600,
    jsonOutput: true,
  });

  const parsed = extractJsonFromAi<{
    score?: number;
    summary?: string;
    strengths?: string[];
    gaps?: string[];
    recommendation?: 'DIREKOMENDASIKAN' | 'PERLU_TINJAUAN' | 'KURANG_SESUAI';
  }>(rawAi);

  const validRecommendation =
    parsed.recommendation === 'DIREKOMENDASIKAN' ||
    parsed.recommendation === 'PERLU_TINJAUAN' ||
    parsed.recommendation === 'KURANG_SESUAI'
      ? parsed.recommendation
      : 'PERLU_TINJAUAN';

  return {
    score: Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 70))),
    summary: parsed.summary || 'Evaluasi awal selesai diproses.',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 5) : [],
    recommendation: validRecommendation,
    evaluatedAt: new Date().toISOString(),
  };
}
