"use client";

import { Search, SlidersHorizontal } from "lucide-react";

// ─── Sort Option ──────────────────────────────────────────────────────────────

export interface SearchFilterSortOption {
  value: string;
  label: string;
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface SearchFilterProps {
  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  // Sort
  sortValue: string;
  onSortChange: (value: string) => void;
  sortOptions: SearchFilterSortOption[];

  // Result info
  resultCount: number;
  totalCount: number;
  searchLabelSingular?: string;
  searchLabelPlural?: string;

  // Optional: hide when total count is 0
  hideWhenEmpty?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SearchFilter({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  sortValue,
  onSortChange,
  sortOptions,
  resultCount,
  totalCount,
  searchLabelSingular = "result",
  searchLabelPlural = "results",
  hideWhenEmpty = false,
}: SearchFilterProps) {
  if (hideWhenEmpty && totalCount === 0) return null;

  return (
    <div>
      {/* Search + Sort toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            data-testid="input-search-filter"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 focus:border-white/20 focus:bg-white/8 focus:outline-none transition"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <select
            value={sortValue}
            onChange={(e) => onSortChange(e.target.value)}
            data-testid="select-sort-filter"
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 transition cursor-pointer [&>option]:bg-black [&>option]:text-white"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Result count */}
      <p className="mt-3 text-xs text-muted-foreground/60">
        {searchValue.trim()
          ? `${resultCount} ${resultCount === 1 ? searchLabelSingular : searchLabelPlural} for "${searchValue}"`
          : `${resultCount} ${resultCount === 1 ? "item" : "items"}`}
      </p>
    </div>
  );
}
