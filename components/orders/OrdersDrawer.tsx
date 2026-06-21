'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft } from 'lucide-react'
import { useOrdersModal } from '@/lib/context/orders-modal-context'
import { OrdersListScreen } from '@/components/orders/OrdersListScreen'
import { OrdersDetailScreen } from '@/components/orders/OrdersDetailScreen'

export function OrdersDrawer() {
  const { isOpen, screen, close, openList } = useOrdersModal()

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[520px] bg-card flex flex-col"
            style={{ boxShadow: '-4px 0 32px rgba(0,0,0,0.12)' }}
          >
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border shrink-0">
              {screen === 'detail' && (
                <button
                  onClick={openList}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface transition-colors text-text-muted hover:text-text"
                  aria-label="Back to orders"
                >
                  <ArrowLeft size={16} strokeWidth={2} />
                </button>
              )}
              <h2 className="text-base font-semibold text-text flex-1">
                {screen === 'detail' ? 'Order detail' : 'My orders'}
              </h2>
              <button
                onClick={close}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface transition-colors text-text-muted hover:text-text"
                aria-label="Close"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <AnimatePresence mode="wait">
                {screen === 'list' ? (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <OrdersListScreen />
                  </motion.div>
                ) : (
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <OrdersDetailScreen />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
