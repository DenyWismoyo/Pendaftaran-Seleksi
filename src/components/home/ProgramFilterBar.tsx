'use client';

import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgramFilterBarProps {
  filteredCount: number;
  totalCount: number;
  search: string;
  categories: string[];
  selectedCategory: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (category: string) => void;
}

export default function ProgramFilterBar({
  filteredCount,
  totalCount,
  search,
  categories,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
}: ProgramFilterBarProps) {
  return (
    <section className="ui-mobile-pad flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
          Daftar Program Terbuka
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Menampilkan {filteredCount} dari {totalCount} program seleksi
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative min-w-[230px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari program atau kata kunci..."
            className="ui-input pl-9"
          />
        </div>

        <div className="flex items-center sm:flex-wrap gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={cn(
                'shrink-0 whitespace-nowrap',
                selectedCategory === cat ? 'ui-chip-active' : 'ui-chip'
              )}
            >
              {cat === 'ALL' ? 'Semua' : cat}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

