import { callClarioChat, CLARIO_MODELS, extractJsonFromAi } from './clario';
import { AiEvaluation, SelectionForm, SelectionSubmission } from '@/types/selection';

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

  const prompt = `Anda adalah Ketua Panitia Seleksi Administrasi & Kompetensi.
Evaluasi data pendaftaran berikut secara objektif, ringkas, dan dalam Bahasa Indonesia.

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

  const rawAi = await callClarioChat({
    model: CLARIO_MODELS.FAST_REASONING,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
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
