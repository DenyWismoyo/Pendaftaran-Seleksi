import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Portal Pendaftaran & Seleksi Online',
  description:
    'Sistem formulir pendaftaran seleksi dinamis, unggah berkas persyaratan, dan verifikasi panitia.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col antialiased bg-slate-50 text-slate-900">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 mt-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Portal Pendaftaran &amp; Seleksi Online</p>
            <p>Terintegrasi Firebase Storage, Firestore &amp; Clario AI</p>
          </div>
        </footer>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
