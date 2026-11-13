'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, Loader2 } from 'lucide-react';
import HomeHeroSection from '@/components/home/HomeHeroSection';
import ProgramCard from '@/components/home/ProgramCard';
import ProgramFilterBar from '@/components/home/ProgramFilterBar';
import { SelectionForm } from '@/types/selection';

export default function HomePage() {
  const router = useRouter();
  const [forms, setForms] = useState<SelectionForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [quickCode, setQuickCode] = useState('');
  const [quickEmail, setQuickEmail] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/forms')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success) setForms(json.data || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(forms.map((f) => f.category).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [forms]);

  const filteredForms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return forms.filter((form) => {
      const matchCategory =
        selectedCategory === 'ALL' || form.category === selectedCategory;
      const matchSearch =
        !q ||
        form.title.toLowerCase().includes(q) ||
        form.description.toLowerCase().includes(q) ||
        form.category.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [forms, selectedCategory, search]);

  const openCount = forms.filter((f) => f.status === 'OPEN').length;

  const handleQuickLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCode.trim() || !quickEmail.trim()) return;
    router.push(
      `/cek-status?code=${encodeURIComponent(
        quickCode.trim().toUpperCase()
      )}&email=${encodeURIComponent(quickEmail.trim())}`
    );
  };

  return (
    <div className="ui-shell space-y-6 sm:space-y-10">
      <HomeHeroSection
        openCount={openCount}
        quickCode={quickCode}
        quickEmail={quickEmail}
        onQuickCodeChange={setQuickCode}
        onQuickEmailChange={setQuickEmail}
        onQuickLookup={handleQuickLookup}
      />

      <ProgramFilterBar
        filteredCount={filteredForms.length}
        totalCount={forms.length}
        search={search}
        categories={categories}
        selectedCategory={selectedCategory}
        onSearchChange={setSearch}
        onCategoryChange={setSelectedCategory}
      />

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-zinc-800" />
          <p className="text-sm">Memuat daftar program seleksi...</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="ui-card-dashed p-10 sm:p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-zinc-400 mx-auto" />
          <h3 className="text-lg font-bold text-zinc-800">
            Belum ada program seleksi yang tersedia
          </h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Panitia dapat membuat formulir baru atau mengimpor template siap pakai di
            halaman Panel Panitia.
          </p>
          <div className="pt-2">
            <Link href="/admin" className="ui-btn-primary">
              <span>Buka Panel Panitia</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {filteredForms.map((form) => (
            <ProgramCard key={form.id} form={form} />
          ))}
        </div>
      )}
    </div>
  );
}
