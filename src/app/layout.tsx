import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import Navbar from '@/components/Navbar';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sistem Seleksi & Registrasi Terpadu',
  description:
    'Portal resmi pendaftaran program seleksi, unggah dokumen persyaratan, dan verifikasi status peserta.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col antialiased bg-[#f6f5f2] text-zinc-900">
        <div className="no-print">
          <Navbar />
        </div>
        <main className="flex-1">{children}</main>
        <footer className="no-print border-t border-zinc-200/80 bg-white py-6 mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="font-medium text-zinc-700">
                Sistem Seleksi &amp; Registrasi Terpadu
              </span>
            </div>
            <p>© {new Date().getFullYear()} • Layanan Penerimaan &amp; Verifikasi Berkas</p>
          </div>
        </footer>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
