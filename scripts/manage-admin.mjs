import fs from 'fs';
import path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * CLI Utility untuk mendaftarkan / mengelola akun Panitia di database terpisah "pendaftaran-seleksi".
 * Pemakaian:
 *   node scripts/manage-admin.mjs add <email> [role] [password_jika_user_baru] [nama]
 *   node scripts/manage-admin.mjs list
 *   node scripts/manage-admin.mjs remove <email>
 */

const DATABASE_ID = process.env.NEXT_PUBLIC_SELEKSI_DATABASE_ID || 'pendaftaran-seleksi';
const VALID_ROLES = [
  'super_admin',
  'admin',
  'admin_pelatihan',
  'operator_pelatihan',
  'admin_tenant',
  'operator_tenant',
];

function init() {
  const saPath = path.resolve(process.cwd(), 'service-account-katalog.json');
  if (!fs.existsSync(saPath)) {
    console.error('Error: File service-account-katalog.json tidak ditemukan di root project.');
    process.exit(1);
  }
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf-8'));
  const app = initializeApp({ credential: cert(sa) });
  return {
    auth: getAuth(app),
    db: getFirestore(app, DATABASE_ID),
  };
}

async function main() {
  const [, , command, emailArg, roleArg, passwordArg, nameArg] = process.argv;
  const { auth, db } = init();

  if (command === 'list') {
    const snap = await db.collection('users').get();
    console.log(`\nDaftar Admin di database "${DATABASE_ID}" (${snap.size}):`);
    for (const doc of snap.docs) {
      const d = doc.data();
      console.log(`- ${d.email || doc.id} | role: ${d.role} | active: ${d.isActive !== false}`);
    }
    return;
  }

  if (command === 'add') {
    if (!emailArg || !emailArg.includes('@')) {
      console.error('Pemakaian: node scripts/manage-admin.mjs add <email> [role] [password_jika_baru] [nama]');
      process.exit(1);
    }
    const email = emailArg.trim().toLowerCase();
    const role = roleArg || 'super_admin';
    if (!VALID_ROLES.includes(role)) {
      console.error(`Role tidak valid. Pilih salah satu: ${VALID_ROLES.join(', ')}`);
      process.exit(1);
    }

    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`User Firebase Auth ditemukan: ${userRecord.uid} (${email})`);
    } catch {
      if (!passwordArg || passwordArg.length < 6) {
        console.error(
          `User "${email}" belum ada di Firebase Auth. Sertakan password minimal 6 karakter pada argumen ke-3 untuk membuatnya.`
        );
        process.exit(1);
      }
      userRecord = await auth.createUser({
        email,
        password: passwordArg,
        displayName: nameArg || email.split('@')[0],
      });
      console.log(`User Firebase Auth baru dibuat: ${userRecord.uid} (${email})`);
    }

    const now = new Date().toISOString();
    await db
      .collection('users')
      .doc(userRecord.uid)
      .set(
        {
          uid: userRecord.uid,
          email,
          name: nameArg || userRecord.displayName || email.split('@')[0],
          role,
          isActive: true,
          updatedAt: now,
          createdAt: now,
        },
        { merge: true }
      );

    console.log(`Berhasil mendaftarkan "${email}" sebagai "${role}" di database "${DATABASE_ID}".`);
    return;
  }

  if (command === 'remove') {
    if (!emailArg) {
      console.error('Pemakaian: node scripts/manage-admin.mjs remove <email>');
      process.exit(1);
    }
    const userRecord = await auth.getUserByEmail(emailArg.trim().toLowerCase());
    await db.collection('users').doc(userRecord.uid).delete();
    console.log(`Akses admin untuk "${emailArg}" dihapus dari database "${DATABASE_ID}".`);
    return;
  }

  console.log('Perintah yang tersedia: list | add | remove');
}

main().catch((err) => {
  console.error('Gagal:', err.message);
  process.exit(1);
});

