'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import type { BuyerOrderDetail } from '@/lib/hooks/useBuyerOrders'

type Screen = 'list' | 'detail'

type OrdersModalState = {
  isOpen: boolean
  screen: Screen
  activeOrderId: string | null
  referenceOrders: BuyerOrderDetail[] | null
}

type OrdersModalContextValue = OrdersModalState & {
  openList: () => void
  openDetail: (orderId: string) => void
  openByReference: (orders: BuyerOrderDetail[]) => void
  close: () => void
}

const OrdersModalContext = createContext<OrdersModalContextValue | null>(null)

export function OrdersModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OrdersModalState>({
    isOpen: false,
    screen: 'list',
    activeOrderId: null,
    referenceOrders: null,
  })

  const openList = useCallback(() =>
    setState(s => ({ ...s, isOpen: true, screen: 'list', activeOrderId: null })), [])

  const openDetail = useCallback((orderId: string) =>
    setState(s => ({ ...s, isOpen: true, screen: 'detail', activeOrderId: orderId })), [])

  const openByReference = useCallback((orders: BuyerOrderDetail[]) =>
    setState({ isOpen: true, screen: 'list', activeOrderId: null, referenceOrders: orders }), [])

  const close = useCallback(() =>
    setState(s => ({ ...s, isOpen: false })), [])

  return (
    <OrdersModalContext.Provider value={{ ...state, openList, openDetail, openByReference, close }}>
      {children}
    </OrdersModalContext.Provider>
  )
}

export function useOrdersModal() {
  const ctx = useContext(OrdersModalContext)
  if (!ctx) throw new Error('useOrdersModal must be used within OrdersModalProvider')
  return ctx
}
