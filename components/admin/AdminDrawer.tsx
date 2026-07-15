'use client'

import { X } from 'lucide-react'
import { ResponsiveDrawer } from '@/components/ui/ResponsiveDrawer'

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
    <ResponsiveDrawer
      open={open}
      onClose={onClose}
      label={label}
      maxWidth={maxWidth}
      panelClassName="bg-card"
      panelStyle={{ background: 'var(--color-card)' }}
    >
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

      <div className="flex-1 overflow-y-auto" data-lenis-prevent>{children}</div>

      {footer && (
        <div className="shrink-0 bg-card border-t border-border px-6 py-4">{footer}</div>
      )}
    </ResponsiveDrawer>
  )
}
