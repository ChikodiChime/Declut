'use client'

import { X } from 'lucide-react'

interface AdminDrawerProps {
  open: boolean
  onClose: () => void
  /** Gradient hero section rendered above the scrollable body */
  hero?: React.ReactNode
  /** Sticky footer (action buttons etc.) */
  footer?: React.ReactNode
  children: React.ReactNode
  /** Accessible label for the dialog */
  label?: string
  /** Panel width cap — default 460 */
  maxWidth?: number
}

export function AdminDrawer({
  open,
  onClose,
  hero,
  footer,
  children,
  label = 'Detail panel',
  maxWidth = 460,
}: AdminDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(15,13,10,0.6)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 280ms ease',
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 51,
          width: '100%', maxWidth,
          background: 'var(--color-card)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 340ms cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: '-2px 0 0 rgba(0,0,0,0.06), -12px 0 60px rgba(0,0,0,0.14)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Hero */}
        {hero && (
          <div
            className="shrink-0 relative"
            style={{ background: 'linear-gradient(145deg, #1e1b6e 0%, #3730a3 55%, #4338ca 100%)' }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center z-10"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.18)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
              }}
            >
              <X size={15} strokeWidth={2.5} />
            </button>
            <div className="px-6 pt-6 pb-7">{hero}</div>
          </div>
        )}

        {/* Plain close bar (when no hero) */}
        {!hero && (
          <div className="shrink-0 flex items-center justify-end px-4 py-3 border-b border-border">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface transition-colors"
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 bg-card border-t border-border px-6 py-4">{footer}</div>
        )}
      </div>
    </>
  )
}
