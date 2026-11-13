import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import PenilaianWorkspace from '@/components/panel/PenilaianWorkspace';

export default function PenilaianPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
        </div>
      }
    >
      <PenilaianWorkspace />
    </Suspense>
  );
}
