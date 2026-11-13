import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminAuth, getAdminDb, verifyAdminRequest } from '@/lib/firebaseAdmin';
import { ADMIN_ROLES, COLLECTIONS } from '@/lib/constants';

const CreateAdminUserSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  role: z.enum(ADMIN_ROLES),
  password: z.string().min(6).optional(),
});

const UpdateAdminUserSchema = z.object({
  uid: z.string().min(1),
  role: z.enum(ADMIN_ROLES).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snap = await getAdminDb().collection(COLLECTIONS.USERS).get();
    const users = snap.docs.map((d) => ({
      uid: d.id,
      ...d.data(),
    }));
    return NextResponse.json({ success: true, data: users });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal memuat daftar panitia.',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin || admin.role !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: 'Hanya super_admin yang dapat menambah akun panitia.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = CreateAdminUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Data panitia tidak valid.',
        },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const auth = getAdminAuth();
    let userRecord;

    try {
      userRecord = await auth.getUserByEmail(email);
    } catch {
      if (!parsed.data.password) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Email belum terdaftar di Firebase Auth. Isi kata sandi awal (min. 6 karakter) untuk membuat akun baru.',
          },
          { status: 400 }
        );
      }
      userRecord = await auth.createUser({
        email,
        password: parsed.data.password,
        displayName: parsed.data.name.trim(),
      });
    }

    const now = new Date().toISOString();
    const docData = {
      uid: userRecord.uid,
      email,
      name: parsed.data.name.trim(),
      role: parsed.data.role,
      isActive: true,
      createdBy: admin.email || admin.uid,
      createdAt: now,
      updatedAt: now,
    };

    await getAdminDb().collection(COLLECTIONS.USERS).doc(userRecord.uid).set(docData, {
      merge: true,
    });

    return NextResponse.json({ success: true, data: docData }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal menambahkan panitia.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin || admin.role !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: 'Hanya super_admin yang dapat mengubah role panitia.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = UpdateAdminUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Parameter update tidak valid.' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (parsed.data.role) updates.role = parsed.data.role;
    if (typeof parsed.data.isActive === 'boolean') updates.isActive = parsed.data.isActive;

    await getAdminDb().collection(COLLECTIONS.USERS).doc(parsed.data.uid).update(updates);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal memperbarui panitia.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await verifyAdminRequest(req);
  if (!admin || admin.role !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: 'Hanya super_admin yang dapat menghapus akses panitia.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    if (!uid) {
      return NextResponse.json({ success: false, error: 'uid wajib diisi.' }, { status: 400 });
    }
    if (uid === admin.uid) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri.' },
        { status: 400 }
      );
    }

    await getAdminDb().collection(COLLECTIONS.USERS).doc(uid).delete();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal menghapus panitia.',
      },
      { status: 500 }
    );
  }
}

