'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import RegistrationCard from '@/components/RegistrationCard';
import StatusLookupForm from '@/components/status/StatusLookupForm';
import StatusProgressCard from '@/components/status/StatusProgressCard';
import { SubmissionStatus } from '@/types/selection';

interface TrackingResult {
  id: string;
  registrationCode: string;
  formTitle: string;
  applicantName: string;
  applicantEmail: string;
  status: SubmissionStatus;
  reviewerNote: string;
  files: { fieldLabel: string; fileName: string; size: number }[];
  createdAt: string;
  updatedAt: string;
}

function CekStatusContent() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);

  const checkStatus = async (targetCode: string, targetEmail: string) => {
    if (!targetCode.trim() || !targetEmail.trim()) {
      toast.error('Masukkan kode pendaftaran dan email.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/submissions?code=${encodeURIComponent(
          targetCode.trim()
        )}&email=${encodeURIComponent(targetEmail.trim())}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setResult(null);
        throw new Error(json.error || 'Data tidak ditemukan.');
      }
      setResult(json.data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memeriksa status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const qCode = searchParams.get('code');
    const qEmail = searchParams.get('email');
    if (qCode && qEmail) {
      checkStatus(qCode, qEmail);
    }
  }, [searchParams]);

  return (
    <div className="ui-shell-narrow space-y-6 sm:space-y-8">
      <div className="no-print ui-mobile-pad max-w-xl mx-auto text-center space-y-2">
        <h1 className="ui-page-title">Lacak Status &amp; Kartu Seleksi</h1>
        <p className="text-sm text-zinc-600">
          Masukkan kode pendaftaran dan email Anda untuk melihat perkembangan
          verifikasi berkas serta mencetak kartu peserta.
        </p>
      </div>

      <StatusLookupForm
        code={code}
        email={email}
        loading={loading}
        onCodeChange={setCode}
        onEmailChange={setEmail}
        onSubmit={(e) => {
          e.preventDefault();
          checkStatus(code, email);
        }}
      />

      {result && (
        <div className="space-y-4 sm:space-y-6">
          <RegistrationCard
            registrationCode={result.registrationCode}
            formTitle={result.formTitle}
            applicantName={result.applicantName}
            applicantEmail={result.applicantEmail}
            status={result.status}
            createdAt={result.createdAt}
            fileCount={result.files.length}
          />

          <StatusProgressCard
            status={result.status}
            reviewerNote={result.reviewerNote}
            files={result.files}
          />
        </div>
      )}
    </div>
  );
}

export default function CekStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-zinc-900" />
        </div>
      }
    >
      <CekStatusContent />
    </Suspense>
  );
}
