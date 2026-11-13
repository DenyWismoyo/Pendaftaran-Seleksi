import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyAdminRequest } from '@/lib/firebaseAdmin';
import { callGeminiLite, extractJsonFromAi } from '@/lib/gemini';
import { COLLECTIONS } from '@/lib/constants';
import { suggestAutofillTargetsForFileField } from '@/lib/autofillMapper';
import { evaluateSubmissionWithAi } from '@/lib/aiEvaluator';
import { assertAllowedAppOrigin, checkRateLimit } from '@/lib/security';
import { SelectionField, SelectionForm, SelectionSubmission } from '@/types/selection';
import { slugify } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const originCheck = assertAllowedAppOrigin(req);
  if (!originCheck.allowed) {
    return NextResponse.json(
      { success: false, error: originCheck.reason },
      { status: 403 }
    );
  }

  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(`ai:${admin.uid}`, 20, 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      {
        success: false,
        error: `Terlalu banyak permintaan evaluasi. Coba lagi dalam ${rate.retryAfterSeconds} detik.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const action = body.action;

    if (action === 'generate-form') {
      const topic = String(body.topic || '').trim();
      const category = String(body.category || 'Pelatihan Vokasi').trim();
      if (topic.length < 4) {
        return NextResponse.json(
          { success: false, error: 'Deskripsi program seleksi terlalu singkat.' },
          { status: 400 }
        );
      }

      const prompt = `Anda adalah Arsitek Formulir Seleksi & Rekrutmen Profesional di Indonesia.
Buatkan rancangan formulir seleksi pendaftaran beserta persyaratan upload berkas untuk program berikut:
Topik / Nama Program: "${topic}"
Kategori: "${category}"

Kembalikan HANYA JSON valid dengan struktur:
{
  "title": "Judul resmi formulir seleksi",
  "description": "Deskripsi singkat program seleksi (2 kalimat)",
  "requirementsNote": "Catatan berkas yang perlu disiapkan pelamar",
  "aiCriteria": "Kriteria penilaian awal untuk panitia/AI",
  "fields": [
    {
      "id": "camelCaseUniqueId",
      "label": "Label Pertanyaan",
      "type": "text" | "textarea" | "email" | "tel" | "number" | "date" | "select" | "radio" | "checkbox" | "file",
      "required": true,
      "placeholder": "Contoh isi...",
      "description": "Keterangan singkat",
      "section": "Nama Bagian (misal: Data Diri, Pengalaman, Unggah Berkas)",
      "options": ["Opsi 1", "Opsi 2"],
      "accept": ".pdf,.jpg,.jpeg,.png",
      "maxSizeMB": 5,
      "width": "full" | "half",
      "autofillMode": "auto" | "custom" | "off",
      "autofillTargets": ["__identity_name", "camelCaseFieldIdYangBisaDiisiDariDokumenIni"]
    }
  ]
}
Catatan:
- Nama lengkap ("__identity_name"), email ("__identity_email"), dan nomor WhatsApp ("__identity_phone") sudah otomatis tersedia di Langkah 1.
- Fokuskan field tambahan pada persyaratan seleksi spesifik dan minimal 2 field bertipe "file" (misal KTP, CV, Ijazah, Makalah).
- Untuk field bertipe "file" yang relevan seperti KTP, CV, Ijazah, atau Makalah, set "autofillMode": "custom" dan isi "autofillTargets" dengan daftar id field yang dapat diekstrak otomatis dari berkas tersebut.`;

      const raw = await callGeminiLite({
        prompt,
        temperature: 0.25,
        maxOutputTokens: 3200,
        jsonOutput: true,
      });

      const parsed = extractJsonFromAi<{
        title: string;
        description: string;
        requirementsNote: string;
        aiCriteria: string;
        fields: SelectionField[];
      }>(raw);

      const rawFields = Array.isArray(parsed.fields) ? parsed.fields : [];
      const enrichedFields = rawFields.map((field) => {
        if (field.type !== 'file') return field;
        const autoSuggested = suggestAutofillTargetsForFileField(field, rawFields);
        const existingTargets = Array.isArray(field.autofillTargets)
          ? field.autofillTargets
          : [];
        const mergedTargets = Array.from(
          new Set([...existingTargets, ...autoSuggested])
        );
        return {
          ...field,
          autofillMode:
            field.autofillMode === 'off'
              ? 'off'
              : mergedTargets.length > 0
                ? 'custom'
                : 'auto',
          autofillTargets: mergedTargets,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          title: parsed.title || topic,
          slug: slugify(parsed.title || topic),
          category,
          description: parsed.description || '',
          requirementsNote: parsed.requirementsNote || '',
          enableAiAutofill: true,
          aiCriteria: parsed.aiCriteria || '',
          fields: enrichedFields,
        },
      });
    }

    if (action === 'evaluate-submission') {
      const submissionId = String(body.submissionId || '').trim();
      if (!submissionId) {
        return NextResponse.json(
          { success: false, error: 'submissionId wajib diisi.' },
          { status: 400 }
        );
      }

      const db = getAdminDb();
      const subRef = db.collection(COLLECTIONS.SUBMISSIONS).doc(submissionId);
      const subSnap = await subRef.get();
      if (!subSnap.exists) {
        return NextResponse.json(
          { success: false, error: 'Data pendaftar tidak ditemukan.' },
          { status: 404 }
        );
      }

      const submission = { id: subSnap.id, ...subSnap.data() } as SelectionSubmission;
      const formSnap = await db.collection(COLLECTIONS.FORMS).doc(submission.formId).get();
      if (!formSnap.exists) {
        return NextResponse.json(
          { success: false, error: 'Formulir terkait tidak ditemukan.' },
          { status: 404 }
        );
      }

      const form = { id: formSnap.id, ...formSnap.data() } as SelectionForm;
      const evaluation = await evaluateSubmissionWithAi(form, submission);

      await subRef.update({
        aiEvaluation: evaluation,
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, data: evaluation });
    }

    return NextResponse.json(
      { success: false, error: 'Aksi asisten tidak dikenali.' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memproses permintaan evaluasi.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
