'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ResponsiveDrawer, DrawerHeader } from '@/components/ui'
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
      maxWidth={420}
      portal
      panelStyle={{ background: 'var(--color-drawer-bg)' }}
    >
      <DrawerHeader
        title={screen === 'detail' ? 'Order detail' : 'My orders'}
        onClose={close}
        onBack={screen === 'detail' ? openList : undefined}
      />

      <div className="flex-1 overflow-y-auto px-4 py-5" data-lenis-prevent>
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
