'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, Clock, Truck, Check, CircleAlert, MapPin, Package } from 'lucide-react'
import type { BuyerOrderDetail } from '@/lib/hooks/useBuyerOrders'

const DELIVERY_STEPS = ['paid', 'confirmed', 'shipped', 'delivered'] as const
const PICKUP_STEPS   = ['paid', 'confirmed', 'delivered']            as const

const STEP_LABEL: Record<string, string> = {
  paid:      'Order placed',
  confirmed: 'Confirmed',
  shipped:   'On the way',
  delivered: 'Delivered',
}

const STEP_ICON: Record<string, React.ElementType> = {
  paid:      ShoppingBag,
  confirmed: Clock,
  shipped:   Truck,
  delivered: Check,
}

const STATUS_ALIAS: Record<string, string> = { completed: 'delivered' }

const GRID_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M36 0H0V36' fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='1'/%3E%3C/svg%3E\")"

const STEP_TIMESTAMP: Record<string, keyof Pick<BuyerOrderDetail, 'created_at' | 'confirmed_at' | 'shipped_at' | 'delivered_at'>> = {
  paid:      'created_at',
  confirmed: 'confirmed_at',
  shipped:   'shipped_at',
  delivered: 'delivered_at',
}

function formatStepTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function OrderProgressHero({
  status, orderId, deliveryType, timestamps,
}: {
  status: string
  orderId: string
  deliveryType: string
  timestamps: Pick<BuyerOrderDetail, 'created_at' | 'confirmed_at' | 'shipped_at' | 'delivered_at'>
}) {
  const resolved    = STATUS_ALIAS[status] ?? status
  const isCancelled = resolved === 'cancelled'
  const bg          = isCancelled ? '#dc2626' : '#3730a3'
  const bgEnd       = isCancelled ? '#ef4444' : '#4338ca'
  const steps       = deliveryType === 'delivery' ? DELIVERY_STEPS : PICKUP_STEPS
  const currentIndex = (steps as unknown as string[]).indexOf(resolved)
  const progressPct  = steps.length > 1 ? Math.max(0, (currentIndex / (steps.length - 1)) * 100) : 0

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${bg} 0%, ${bgEnd} 100%)`, boxShadow: `0 6px 24px ${bg}35` }}
    >
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: GRID_SVG, backgroundSize: '36px 36px' }} />
      <div aria-hidden className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }} />

      <div className="relative z-10 px-6 pt-5 pb-7 sm:px-8 sm:pt-6 sm:pb-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-white/55 text-xs font-medium tracking-widest uppercase">
            Order #{orderId.slice(0, 8).toUpperCase()}
          </p>
          {!isCancelled && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              {deliveryType === 'delivery'
                ? <><Truck size={10} strokeWidth={2} /> Delivery</>
                : <><MapPin size={10} strokeWidth={2} /> Pickup</>}
            </span>
          )}
          {isCancelled && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              <CircleAlert size={10} strokeWidth={2} /> Cancelled
            </span>
          )}
        </div>

        {!isCancelled ? (
          <div>
            <div className="flex justify-between mb-2">
              {steps.map((step) => {
                const tsKey = STEP_TIMESTAMP[step]
                const time  = formatStepTime(timestamps[tsKey])
                return (
                  <div key={step} className="flex justify-center" style={{ width: 48 }}>
                    {time && (
                      <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-[9px] text-center leading-tight whitespace-nowrap"
                        style={{ color: 'rgba(255,255,255,0.65)' }}
                      >
                        {time}
                      </motion.span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="relative flex justify-between items-center" style={{ height: 48 }}>
              <div className="absolute rounded-full pointer-events-none"
                style={{ left: 24, right: 24, top: '50%', transform: 'translateY(-50%)', height: 6, background: 'rgba(255,255,255,0.18)', zIndex: 0 }} />
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{ left: 24, top: '50%', transform: 'translateY(-50%)', height: 6, background: 'rgba(255,255,255,0.92)', boxShadow: '0 0 10px rgba(255,255,255,0.35)', right: 'auto', zIndex: 1 }}
                initial={{ width: 0 }}
                animate={{ width: progressPct > 0 ? `calc(${progressPct}% - 48px)` : 0 }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />
              {steps.map((step, i) => {
                const done   = currentIndex >= i
                const active = currentIndex === i
                const Icon   = STEP_ICON[step] ?? Package
                return (
                  <motion.div key={step}
                    className="relative flex items-center justify-center rounded-full shrink-0"
                    style={{ width: 48, height: 48, zIndex: 2, background: done ? 'rgba(255,255,255,0.97)' : bg, border: active ? '2.5px solid rgba(255,255,255,0.9)' : done ? 'none' : '2px solid rgba(255,255,255,0.35)', boxShadow: done ? '0 4px 16px rgba(0,0,0,0.2), 0 0 0 4px rgba(255,255,255,0.12)' : active ? '0 0 0 4px rgba(255,255,255,0.15)' : undefined }}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 300, damping: 22 }}
                  >
                    {done
                      ? <Icon size={18} strokeWidth={2.25} style={{ color: bg }} />
                      : <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>{i + 1}</span>
                    }
                    {active && (
                      <motion.span
                        className="absolute inset-0 rounded-full"
                        style={{ border: '2px solid rgba(255,255,255,0.5)' }}
                        animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                      />
                    )}
                  </motion.div>
                )
              })}
            </div>

            <div className="flex justify-between mt-3">
              {steps.map((step, i) => {
                const done   = currentIndex >= i
                const active = currentIndex === i
                return (
                  <div key={step} className="flex justify-center" style={{ width: 48 }}>
                    <span className="text-[10px] text-center leading-tight"
                      style={{ fontWeight: active ? 700 : done ? 500 : 400, color: active ? '#fff' : done ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)', width: 64 }}>
                      {STEP_LABEL[step]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-white/70 text-sm">This order has been cancelled and refunded.</p>
        )}
      </div>
    </div>
  )
}
