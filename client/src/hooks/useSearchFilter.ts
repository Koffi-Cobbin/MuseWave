"use client";

import { useState, useEffect, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SortDirection = "asc" | "desc";

export type SortConfig<T> = {
  value: string;
  label: string;
  comparer: (a: T, b: T) => number;
};

export interface UseSearchFilterOptions<T> {
  /** The full array of data items to filter / sort / paginate */
  data: T[];
  /** Which fields to search against (matched via lowercased substring) */
  searchFields: (keyof T)[];
  /** The default sort option value (must match a key in sortConfig) */
  defaultSort?: string;
  /** Sort configuration array */
  sortConfig?: SortConfig<T>[];
  /** Items per page (default 10) */
  itemsPerPage?: number;
}

export interface UseSearchFilterReturn<T> {
  // State
  search: string;
  sort: string;
  page: number;

  // Setters (also reset page to 1 when search/sort change)
  setSearch: (v: string) => void;
  setSort: (v: string) => void;
  setPage: (v: number) => void;

  // Derived
  filtered: T[];
  paged: T[];
  totalPages: number;
  totalCount: number;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSearchFilter<T extends Record<string, any>>({
  data,
  searchFields,
  defaultSort = "",
  sortConfig = [],
  itemsPerPage = 10,
}: UseSearchFilterOptions<T>): UseSearchFilterReturn<T> {
  const [search, setSearchState] = useState("");
  const [sort, setSortState] = useState(defaultSort);
  const [page, setPageState] = useState(1);

  // Build a lookup map for sort comparers
  const sortMap = useMemo(() => {
    const map: Record<string, (a: T, b: T) => number> = {};
    for (const sc of sortConfig) {
      map[sc.value] = sc.comparer;
    }
    return map;
  }, [sortConfig]);

  // Reset page to 1 when search or sort changes
  useEffect(() => {
    setPageState(1);
  }, [search, sort]);

  const setSearch = (v: string) => {
    setSearchState(v);
  };

  const setSort = (v: string) => {
    setSortState(v);
  };

  const setPage = (v: number) => {
    setPageState(v);
  };

  // ── Filter + Sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...data];

    // Search
    const q = search.trim();
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const val = item[field];
          return val != null && String(val).toLowerCase().includes(lower);
        }),
      );
    }

    // Sort
    const comparer = sortMap[sort];
    if (comparer) {
      result.sort(comparer);
    }

    return result;
  }, [data, search, sort, searchFields, sortMap]);

  // ── Paginate ───────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

  // Clamp page if it exceeds total pages (e.g. when filtering reduces results)
  const clampedPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (clampedPage - 1) * itemsPerPage,
    clampedPage * itemsPerPage,
  );

  return {
    search,
    setSearch,
    sort,
    setSort,
    page: clampedPage,
    setPage,
    filtered,
    paged,
    totalPages,
    totalCount: data.length,
  };
}
