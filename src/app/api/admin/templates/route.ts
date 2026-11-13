import { NextRequest, NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminDb, verifyAdminRequest } from '@/lib/firebaseAdmin';
import { assertAllowedAppOrigin } from '@/lib/security';
import { normalizeStaticTemplates } from '@/lib/templateScope';
import { slugify } from '@/lib/utils';
import {
  DocumentTemplateInputSchema,
  DocumentTemplateRecord,
  SelectionForm,
} from '@/types/selection';

async function seedDefaultTemplatesIntoDb(adminEmail: string) {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTIONS.TEMPLATES).get();
  const existingSlugs = new Set(snap.docs.map((d) => String(d.data()?.slug || '')));
  const formsSnap = await db.collection(COLLECTIONS.FORMS).get();
  const forms = formsSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as SelectionForm
  );

  const defaults = normalizeStaticTemplates();
  const batch = db.batch();
  const now = new Date().toISOString();
  let added = 0;

  for (const tpl of defaults) {
    if (existingSlugs.has(tpl.slug)) continue;

    // Auto-bind built-in templates to matching existing forms for instant per-selection isolation
    const matchedFormIds = forms
      .filter((f) => {
        const text = `${f.title} ${f.slug} ${f.category}`.toLowerCase();
        const cat = tpl.category.toLowerCase();
        if (tpl.isGlobal) return true;
        if (/pejabat|teknis/.test(text) && cat.includes('pejabat')) return true;
        if (/vokasi|pelatihan/.test(text) && cat.includes('vokasi')) return true;
        if (/magang|pkl/.test(text) && cat.includes('magang')) return true;
        return false;
      })
      .map((f) => f.id);

    const id = `tpl-${slugify(tpl.slug)}`.slice(0, 64);
    const ref = db.collection(COLLECTIONS.TEMPLATES).doc(id);
    const record: DocumentTemplateRecord = {
      ...tpl,
      id,
      formIds: matchedFormIds,
      createdBy: adminEmail,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(ref, record);
    added++;
  }

  if (added > 0) {
    await batch.commit();
  }
  return added;
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    let snap = await db.collection(COLLECTIONS.TEMPLATES).get();
    if (snap.empty) {
      await seedDefaultTemplatesIntoDb(admin.email || admin.uid);
      snap = await db.collection(COLLECTIONS.TEMPLATES).get();
    }

    const templates = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as DocumentTemplateRecord)
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    return NextResponse.json({ success: true, data: templates });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal memuat template admin.',
      },
      { status: 500 }
    );
  }
}

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
    const body = await req.json();

    if (body?.action === 'seed-defaults') {
      const added = await seedDefaultTemplatesIntoDb(admin.email || admin.uid);
      return NextResponse.json({ success: true, data: { added } });
    }

    const parsed = DocumentTemplateInputSchema.safeParse({
      ...body,
      slug: slugify(String(body?.slug || body?.title || '')),
      fileBaseName: slugify(String(body?.fileBaseName || body?.title || 'template')),
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Data template tidak valid.',
        },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const input = parsed.data;
    const dupSnap = await db
      .collection(COLLECTIONS.TEMPLATES)
      .where('slug', '==', input.slug)
      .limit(1)
      .get();

    const finalSlug = dupSnap.empty
      ? input.slug
      : `${input.slug}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const id = `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const record: DocumentTemplateRecord = {
      ...input,
      id,
      slug: finalSlug,
      createdBy: admin.email || admin.uid,
      createdAt: now,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.set(db.collection(COLLECTIONS.TEMPLATES).doc(id), record);

    // Sync selected formIds -> form.documentTemplateIds if that form already uses documentTemplateIds
    if (record.formIds.length > 0) {
      for (const formId of record.formIds) {
        const fRef = db.collection(COLLECTIONS.FORMS).doc(formId);
        const fSnap = await fRef.get();
        if (fSnap.exists) {
          const fData = fSnap.data() as SelectionForm;
          if (Array.isArray(fData.documentTemplateIds) && fData.documentTemplateIds.length > 0) {
            const nextIds = Array.from(new Set([...fData.documentTemplateIds, id]));
            batch.update(fRef, { documentTemplateIds: nextIds, updatedAt: now });
          }
        }
      }
    }

    await batch.commit();
    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal membuat template dokumen.',
      },
      { status: 500 }
    );
  }
}

