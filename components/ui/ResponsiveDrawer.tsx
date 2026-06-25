'use client'

import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface ResponsiveDrawerProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Accessible label for the dialog */
  label?: string
  /** Desktop max width in px — default 460 */
  maxWidth?: number
  /** Which edge the drawer attaches to on md+ viewports */
  desktopSide?: 'left' | 'right'
  className?: string
  panelClassName?: string
  panelStyle?: CSSProperties
  /** Show drag handle on mobile — default true */
  showHandle?: boolean
  /** Render into document.body */
  portal?: boolean
  zIndex?: number
  lockScroll?: boolean
}

export function ResponsiveDrawer({
  open,
  onClose,
  children,
  label = 'Panel',
  maxWidth = 460,
  desktopSide = 'right',
  className = '',
  panelClassName = '',
  panelStyle,
  showHandle = true,
  portal = false,
  zIndex = 50,
  lockScroll = true,
}: ResponsiveDrawerProps) {
  useEffect(() => {
    if (!lockScroll) return
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open, lockScroll])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const transformClass = open
    ? 'translate-y-0 md:translate-x-0'
    : desktopSide === 'right'
      ? 'translate-y-full md:translate-y-0 md:translate-x-full'
      : 'translate-y-full md:translate-y-0 md:-translate-x-full'

  const shadowClass =
    desktopSide === 'right'
      ? 'shadow-[0_-8px_48px_rgba(22,19,15,0.18)] md:shadow-[-8px_0_48px_rgba(22,19,15,0.18)]'
      : 'shadow-[0_-8px_48px_rgba(22,19,15,0.18)] md:shadow-[8px_0_48px_rgba(22,19,15,0.18)]'

  const positionClass =
    desktopSide === 'right'
      ? 'md:right-0 md:left-auto'
      : 'md:left-0 md:right-auto'

  const panel = (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 ${className}`}
        style={{
          zIndex,
          background: 'rgba(15,13,10,0.6)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 280ms ease',
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={[
          'fixed flex flex-col overflow-hidden w-full',
          'bottom-0 left-0 right-0 max-h-[92dvh] rounded-t-2xl',
          'md:top-0 md:bottom-0 md:max-h-none md:rounded-none',
          positionClass,
          transformClass,
          shadowClass,
          'transition-transform duration-[340ms] ease-[cubic-bezier(0.32,0.72,0,1)]',
          panelClassName,
        ].join(' ')}
        style={{
          zIndex: zIndex + 1,
          maxWidth,
          paddingBottom: 'env(safe-area-inset-bottom)',
          ...panelStyle,
        }}
      >
        {showHandle && (
          <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-border-strong" />
          </div>
        )}
        {children}
      </div>
    </>
  )

  if (portal) {
    if (typeof document === 'undefined') return null
    return createPortal(panel, document.body)
  }

  return panel
}
