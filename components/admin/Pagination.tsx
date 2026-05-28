'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
}

export function Pagination({ page, pageSize, total, onPage }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  // Build page number list with ellipsis
  function pageNumbers(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages]
    if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '…', page - 1, page, page + 1, '…', totalPages]
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-border">
      <p className="text-xs text-text-muted">
        {from}–{to} of {total.toLocaleString('en-NG')}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:bg-surface hover:text-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        {pageNumbers().map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-text-muted">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={[
                'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors',
                p === page
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:bg-surface hover:text-text',
              ].join(' ')}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:bg-surface hover:text-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
