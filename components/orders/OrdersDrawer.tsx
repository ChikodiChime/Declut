'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft } from 'lucide-react'
import { ResponsiveDrawer } from '@/components/ui/ResponsiveDrawer'
import { useOrdersModal } from '@/lib/context/orders-modal-context'
import { OrdersListScreen } from '@/components/orders/OrdersListScreen'
import { OrdersDetailScreen } from '@/components/orders/OrdersDetailScreen'

export function OrdersDrawer() {
  const { isOpen, screen, close, openList } = useOrdersModal()

  return (
    <ResponsiveDrawer
      open={isOpen}
      onClose={close}
      label={screen === 'detail' ? 'Order detail' : 'My orders'}
      maxWidth={520}
      portal
      panelClassName="bg-card"
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
    </ResponsiveDrawer>
  )
}
