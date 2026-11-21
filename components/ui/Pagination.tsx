"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

// Page numbers to show: always first and last, plus a window around the
// current page; gaps are marked with "…".
function pageList(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach(p => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach(p => pages.add(p));
  const sorted = Array.from(pages).filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

const btn = "nexora-btn nexora-btn-outline py-1.5 px-2.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed";

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  const [jump, setJump] = useState(String(page));
  useEffect(() => setJump(String(page)), [page]);

  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  const go = (p: number) => {
    const target = Math.min(Math.max(1, p), totalPages);
    if (target !== page) onPageChange(target);
  };

  const commitJump = () => {
    const n = parseInt(jump, 10);
    if (isNaN(n)) { setJump(String(page)); return; }
    const target = Math.min(Math.max(1, n), totalPages);
    setJump(String(target));
    go(target);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-1">
      <p className="text-xs text-zinc-500">
        Showing {start}–{end} of {totalItems}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => go(1)} disabled={page <= 1} className={btn} title="First page">
          <ChevronsLeft size={14} />
        </button>
        <button type="button" onClick={() => go(page - 1)} disabled={page <= 1} className={btn} title="Previous page">
          <ChevronLeft size={14} />
        </button>

        {pageList(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-zinc-400">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              aria-current={p === page ? "page" : undefined}
              className={`nexora-btn ${p === page ? "nexora-btn-primary" : "nexora-btn-outline"} py-1.5 px-2.5 text-xs min-w-[32px] justify-center`}
            >
              {p}
            </button>
          )
        )}

        <button type="button" onClick={() => go(page + 1)} disabled={page >= totalPages} className={btn} title="Next page">
          <ChevronRight size={14} />
        </button>
        <button type="button" onClick={() => go(totalPages)} disabled={page >= totalPages} className={btn} title="Last page">
          <ChevronsRight size={14} />
        </button>

        <form
          onSubmit={e => { e.preventDefault(); commitJump(); }}
          className="flex items-center gap-1.5 ml-2 text-xs text-zinc-500"
        >
          <label htmlFor="pagination-jump">Go to</label>
          <input
            id="pagination-jump"
            type="number"
            inputMode="numeric"
            min={1}
            max={totalPages}
            value={jump}
            onChange={e => setJump(e.target.value)}
            onBlur={commitJump}
            onFocus={e => e.target.select()}
            className="nexora-input w-16 py-1.5 px-2 text-xs text-center"
          />
          <span>of {totalPages}</span>
        </form>
      </div>
    </div>
  );
}
