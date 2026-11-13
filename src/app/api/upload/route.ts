import { NextRequest, NextResponse } from 'next/server';
import { getDownloadURL } from 'firebase-admin/storage';
import { getAdminBucket, getAdminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/constants';
import { SelectionForm } from '@/types/selection';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const formId = String(formData.get('formId') || '').trim();
    const fieldId = String(formData.get('fieldId') || '').trim();

    if (!file || !formId || !fieldId) {
      return NextResponse.json(
        { success: false, error: 'Parameter file, formId, dan fieldId wajib diisi.' },
        { status: 400 }
      );
    }

    // Pastikan formulir ada dan masih OPEN
    const formSnap = await getAdminDb().collection(COLLECTIONS.FORMS).doc(formId).get();
    if (!formSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Formulir seleksi tidak ditemukan.' },
        { status: 404 }
      );
    }
    const form = formSnap.data() as SelectionForm;
    if (form.status !== 'OPEN') {
      return NextResponse.json(
        { success: false, error: 'Pendaftaran untuk formulir ini sudah ditutup.' },
        { status: 403 }
      );
    }

    const fieldDef = form.fields?.find((f) => f.id === fieldId && f.type === 'file');
    if (!fieldDef) {
      return NextResponse.json(
        { success: false, error: 'Field unggah berkas tidak dikenali.' },
        { status: 400 }
      );
    }

    const maxBytes = (fieldDef.maxSizeMB || 5) * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          success: false,
          error: `Ukuran berkas melebihi batas maksimal ${fieldDef.maxSizeMB || 5} MB.`,
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Format berkas tidak didukung. Gunakan PDF, JPG, PNG, WEBP, atau DOC/DOCX.',
        },
        { status: 400 }
      );
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `selection_uploads/${formId}/${fieldId}/${Date.now()}-${safeFileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const bucket = getAdminBucket();
    const fileRef = bucket.file(storagePath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          formId,
          fieldId,
          originalName: file.name,
        },
      },
    });

    const downloadUrl = await getDownloadURL(fileRef);

    return NextResponse.json({
      success: true,
      data: {
        fieldId,
        fieldLabel: fieldDef.label,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        url: downloadUrl,
        storagePath,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mengunggah berkas.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
