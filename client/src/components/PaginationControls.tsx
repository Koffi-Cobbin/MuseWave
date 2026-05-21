"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Props ───────────────────────────────────────────────────────────────────

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        data-testid="button-pagination-prev"
        className="border-white/10 bg-white/5 disabled:opacity-40"
      >
        <ChevronLeft className="mr-1 h-3.5 w-3.5" />
        Prev
      </Button>

      <div className="flex gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            data-testid={`button-pagination-page-${p}`}
            className={cn(
              "h-8 min-w-[32px] rounded-lg px-2 text-xs font-medium transition",
              p === currentPage
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:bg-white/8 hover:text-foreground",
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        data-testid="button-pagination-next"
        className="border-white/10 bg-white/5 disabled:opacity-40"
      >
        Next
        <ChevronRight className="ml-1 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
