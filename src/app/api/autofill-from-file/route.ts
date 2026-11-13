import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminBucket, getAdminDb } from '@/lib/firebaseAdmin';
import { getEffectiveFileAutofillTargets } from '@/lib/autofillMapper';
import { COLLECTIONS } from '@/lib/constants';
import { callGeminiLite, extractJsonFromAi } from '@/lib/gemini';
import {
  assertAllowedAppOrigin,
  checkRateLimit,
  getClientIp,
} from '@/lib/security';
import { AutofillSuggestion, SelectionForm } from '@/types/selection';

const AutofillRequestSchema = z.object({
  formId: z.string().min(1),
  fieldId: z.string().min(1),
  storagePath: z.string().min(5),
  draftToken: z.string().optional(),
});

const SUPPORTED_INLINE_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_AUTOFILL_BYTES = 4 * 1024 * 1024; // 4 MB

export async function POST(req: NextRequest) {
  const originCheck = assertAllowedAppOrigin(req);
  if (!originCheck.allowed) {
    return NextResponse.json(
      { success: false, error: originCheck.reason },
      { status: 403 }
    );
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`autofill:${ip}`, 12, 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      {
        success: false,
        error: `Terlalu banyak permintaan pembacaan dokumen. Tunggu ${rate.retryAfterSeconds} detik.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = AutofillRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Parameter pembacaan berkas tidak lengkap.' },
        { status: 400 }
      );
    }

    const { formId, fieldId, storagePath, draftToken } = parsed.data;
    const expectedPrefix = draftToken
      ? `selection_uploads/${formId}/tmp/${draftToken.trim().toUpperCase()}/`
      : `selection_uploads/${formId}/tmp/`;

    if (!storagePath.startsWith(expectedPrefix) || storagePath.includes('..')) {
      return NextResponse.json(
        { success: false, error: 'Akses ke berkas draf tersebut tidak diizinkan.' },
        { status: 403 }
      );
    }

    const db = getAdminDb();
    const formSnap = await db.collection(COLLECTIONS.FORMS).doc(formId).get();
    if (!formSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Formulir tidak ditemukan.' },
        { status: 404 }
      );
    }

    const form = { id: formSnap.id, ...formSnap.data() } as SelectionForm;
    if (form.status !== 'OPEN') {
      return NextResponse.json(
        { success: false, error: 'Formulir ini sedang tidak dibuka.' },
        { status: 403 }
      );
    }

    if (form.enableAiAutofill === false) {
      return NextResponse.json({
        success: true,
        data: { suggestions: [] as AutofillSuggestion[] },
      });
    }

    const fileField = form.fields.find((f) => f.id === fieldId && f.type === 'file');
    if (!fileField) {
      return NextResponse.json(
        { success: false, error: 'Field dokumen tidak ditemukan.' },
        { status: 400 }
      );
    }

    const targets = getEffectiveFileAutofillTargets(fileField, form);
    if (targets.length === 0) {
      return NextResponse.json({
        success: true,
        data: { suggestions: [] as AutofillSuggestion[] },
      });
    }

    const fileRef = getAdminBucket().file(storagePath);
    const [meta] = await fileRef.getMetadata();
    const mimeType = String(meta.contentType || '').toLowerCase();
    const size = Number(meta.size || 0);

    if (!SUPPORTED_INLINE_MIME.has(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Ekstraksi isian otomatis mendukung berkas PDF, JPG, PNG, atau WEBP.',
        },
        { status: 400 }
      );
    }

    if (size <= 0 || size > MAX_AUTOFILL_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Ukuran berkas terlalu besar untuk dibaca otomatis (maksimal 4 MB).',
        },
        { status: 400 }
      );
    }

    const [buffer] = await fileRef.download();
    const normalizedMime = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;

    const targetSpecText = targets
      .map((t) => {
        const opts =
          t.options && t.options.length > 0
            ? ` | Pilihan wajib persis salah satu: [${t.options.join(' | ')}]`
            : '';
        return `- fieldId: "${t.id}" | label: "${t.label}" | type: "${t.type}"${opts}`;
      })
      .join('\n');

    const prompt = `Anda adalah sistem ekstraksi data dokumen resmi pendaftaran seleksi.
Tugas Anda: baca dokumen "${fileField.label}" terlampir, lalu ekstrak nilai yang BENAR-BENAR TERTULIS di dalam dokumen untuk menyarankan pengisian kolom formulir berikut.

ATURAN KETAT:
1. JANGAN PERNAH mengarang atau menebak data yang tidak tertulis jelas di dokumen. Lewati field yang datanya tidak ada di dokumen.
2. Untuk tipe "date", wajib format YYYY-MM-DD (misal: 1994-08-17).
3. Untuk NIK atau angka, tulis digit angka bersih tanpa tanda baca.
4. Untuk tipe "select" atau "radio", nilai WAJIB persis sama dengan salah satu pilihan yang tersedia.
5. Untuk tipe "checkbox", kembalikan array string berisi pilihan yang cocok persis.
6. Untuk tipe "textarea", rangkum secara rapi, profesional, dan objektif dalam Bahasa Indonesia sesuai isi dokumen.

Daftar Kolom Target yang Boleh Diisi:
${targetSpecText}

Kembalikan HANYA JSON valid dengan struktur:
{
  "suggestions": [
    {
      "fieldId": "string (harus ada di daftar)",
      "value": "string atau string[] untuk checkbox",
      "confidence": "high" | "medium",
      "reason": "Alasan singkat max 8 kata (misal: Terbaca di header KTP / CV)"
    }
  ]
}`;

    const rawAi = await callGeminiLite({
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: normalizedMime,
            data: buffer.toString('base64'),
          },
        },
      ],
      temperature: 0.1,
      maxOutputTokens: 2500,
      jsonOutput: true,
    });

    const extracted = extractJsonFromAi<{
      suggestions?: Array<{
        fieldId?: string;
        value?: string | string[] | number;
        confidence?: 'high' | 'medium';
        reason?: string;
      }>;
    }>(rawAi);

    const targetMap = new Map(targets.map((t) => [t.id, t]));
    const cleanSuggestions: AutofillSuggestion[] = [];

    for (const item of extracted.suggestions || []) {
      const t = item.fieldId ? targetMap.get(item.fieldId) : undefined;
      if (!t || item.value === undefined || item.value === null) continue;

      if (t.type === 'checkbox') {
        const rawArr = Array.isArray(item.value)
          ? item.value.map(String)
          : [String(item.value)];
        const validOpts = t.options || [];
        const matched = rawArr.filter((v) => validOpts.includes(v));
        if (matched.length === 0) continue;
        cleanSuggestions.push({
          fieldId: t.id,
          label: t.label,
          value: matched,
          confidence: item.confidence === 'high' ? 'high' : 'medium',
          reason: item.reason || `Terbaca dari ${fileField.label}`,
        });
        continue;
      }

      const strValue = String(item.value).trim();
      if (!strValue || strValue === '-' || /^tidak (ada|diketahui|tercantum)/i.test(strValue)) {
        continue;
      }

      if ((t.type === 'select' || t.type === 'radio') && t.options && t.options.length > 0) {
        const exact = t.options.find(
          (opt) => opt.toLowerCase() === strValue.toLowerCase()
        );
        if (!exact) continue;
        cleanSuggestions.push({
          fieldId: t.id,
          label: t.label,
          value: exact,
          confidence: item.confidence === 'high' ? 'high' : 'medium',
          reason: item.reason || `Terbaca dari ${fileField.label}`,
        });
        continue;
      }

      cleanSuggestions.push({
        fieldId: t.id,
        label: t.label,
        value: strValue,
        confidence: item.confidence === 'high' ? 'high' : 'medium',
        reason: item.reason || `Terbaca dari ${fileField.label}`,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        sourceFieldId: fileField.id,
        sourceFieldLabel: fileField.label,
        suggestions: cleanSuggestions,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Gagal membaca dokumen untuk pengisian otomatis.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

