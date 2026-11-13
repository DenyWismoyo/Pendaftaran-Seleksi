import { NextRequest, NextResponse } from 'next/server';
import { getDownloadURL } from 'firebase-admin/storage';
import { getAdminBucket, verifyAdminRequest } from '@/lib/firebaseAdmin';
import { assertAllowedAppOrigin } from '@/lib/security';

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

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

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const kind = String(formData.get('kind') || 'cover-attachment').trim();
    const rawFormKey = String(formData.get('formKey') || 'draft').trim();
    const safeFormKey =
      rawFormKey.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'draft';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File unggahan wajib dipilih.' },
        { status: 400 }
      );
    }

    if (kind !== 'cover-image' && kind !== 'cover-attachment') {
      return NextResponse.json(
        { success: false, error: 'Tipe aset cover tidak dikenali.' },
        { status: 400 }
      );
    }

    const allowedMimes =
      kind === 'cover-image' ? IMAGE_MIME_TYPES : ATTACHMENT_MIME_TYPES;
    if (!allowedMimes.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error:
            kind === 'cover-image'
              ? 'Cover gambar wajib berformat JPG, PNG, atau WEBP.'
              : 'Dokumen lampiran mendukung PDF, DOC/DOCX, atau gambar JPG/PNG/WEBP.',
        },
        { status: 400 }
      );
    }

    const maxMB = kind === 'cover-image' ? 5 : 15;
    if (file.size > maxMB * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: `Ukuran file melebihi batas maksimal ${maxMB} MB.`,
        },
        { status: 400 }
      );
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `selection_cover_assets/${safeFormKey}/${kind}/${Date.now()}-${safeFileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const bucket = getAdminBucket();
    const fileRef = bucket.file(storagePath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: admin.email || admin.uid,
          kind,
          originalName: file.name,
        },
      },
    });

    const downloadUrl = await getDownloadURL(fileRef);

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        url: downloadUrl,
        storagePath,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mengunggah aset cover.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

  try {
    const body = await req.json();
    const storagePath = String(body.storagePath || '').trim();
    if (!storagePath.startsWith('selection_cover_assets/') || storagePath.includes('..')) {
      return NextResponse.json(
        { success: false, error: 'Path aset cover tidak valid.' },
        { status: 400 }
      );
    }

    await getAdminBucket().file(storagePath).delete({ ignoreNotFound: true });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menghapus aset cover.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

