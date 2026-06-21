'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useSubmitReview } from '@/lib/hooks/useBuyerOrders'

export function ReviewThankYou() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #059669, #34d399)' }} />
      <div className="p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(5,150,105,0.1)' }}>
          <Check size={16} strokeWidth={2.5} style={{ color: '#059669' }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-text">Thanks for the feedback!</p>
          <p className="text-xs text-text-muted mt-0.5">Your review helps buyers trust great sellers.</p>
        </div>
      </div>
    </motion.div>
  )
}

export function ReviewForm({ orderId, sellerName, onReviewed }: {
  orderId: string
  sellerName: string | null
  onReviewed: () => void
}) {
  const [hovered, setHovered] = useState(0)
  const [selected, setSelected] = useState(0)
  const [comment, setComment] = useState('')
  const { mutate: submit, isPending } = useSubmitReview()

  function handleSubmit() {
    if (selected === 0) return
    submit(
      { order_id: orderId, rating: selected, comment: comment.trim() || undefined },
      { onSuccess: onReviewed, onError: (e) => toast.error(e.message) }
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Star size={13} strokeWidth={2} style={{ color: '#d97706' }} />
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#d97706' }}>
            Rate your experience
          </p>
        </div>
        <p className="text-sm text-text-muted mb-4">How was {sellerName ?? 'the seller'}?</p>
        <div className="flex gap-2 mb-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setSelected(n)}
              className="transition-transform duration-100 active:scale-90"
              style={{ lineHeight: 1 }}
            >
              <Star
                size={32}
                strokeWidth={1.5}
                style={{
                  color: n <= (hovered || selected) ? '#f59e0b' : '#e5e7eb',
                  fill: n <= (hovered || selected) ? '#f59e0b' : 'transparent',
                  transition: 'color 0.1s, fill 0.1s',
                }}
              />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Anything else? (optional)"
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ '--tw-ring-color': 'rgba(55,48,163,0.3)' } as React.CSSProperties}
        />
        <button
          onClick={handleSubmit}
          disabled={selected === 0 || isPending}
          className="mt-3 w-full rounded-xl py-3 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-40"
          style={{ background: '#3730a3' }}
          onMouseEnter={(e) => { if (selected > 0) (e.currentTarget as HTMLElement).style.background = '#312e81' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#3730a3' }}
        >
          {isPending ? 'Submitting…' : 'Submit review'}
        </button>
      </div>
    </motion.div>
  )
}
