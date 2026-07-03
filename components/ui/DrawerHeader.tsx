'use client'

import { X, ArrowLeft } from 'lucide-react'
import type { RefObject, ReactNode } from 'react'

interface DrawerHeaderProps {
  title: string
  onClose: () => void
  onBack?: () => void
  badge?: ReactNode
  closeButtonRef?: RefObject<HTMLButtonElement | null>
}

const iconButtonClass =
  'flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200'

const iconButtonStyle = { color: 'rgba(255,255,255,0.45)' }

function bindIconHover(el: HTMLElement, active: boolean) {
  el.style.background = active ? 'rgba(255,255,255,0.1)' : 'transparent'
  el.style.color = active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)'
}

export function DrawerHeader({
  title,
  onClose,
  onBack,
  badge,
  closeButtonRef,
}: DrawerHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-6 py-5 shrink-0"
      style={{ background: 'var(--color-drawer-header, #16130f)' }}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className={`${iconButtonClass} shrink-0`}
            style={iconButtonStyle}
            onMouseEnter={(e) => bindIconHover(e.currentTarget, true)}
            onMouseLeave={(e) => bindIconHover(e.currentTarget, false)}
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
        )}
        <span
          className="font-display text-[19px] font-bold truncate"
          style={{ color: '#ffffff' }}
        >
          {title}
        </span>
        {badge}
      </div>
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className={`${iconButtonClass} shrink-0`}
        style={iconButtonStyle}
        onMouseEnter={(e) => bindIconHover(e.currentTarget, true)}
        onMouseLeave={(e) => bindIconHover(e.currentTarget, false)}
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  )
}
