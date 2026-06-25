'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ListingImage } from '@/components/ui'
import {
  Package, MapPin, KeyRound, ArrowRight,
  Truck, Phone, Copy, Clock, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useAvailableOrders,
  useMyDeliveries,
  useClaimOrder,
  useVerifyDelivery,
  type DispatchOrder,
} from '@/lib/hooks/useDispatch'
import { Button } from '@/components/ui'
import { DispatchHeader } from '@/app/dispatch/(portal)/DispatchHeader'

function OrderSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-4">
      <div className="flex gap-3 mb-3">
        <div className="w-14 h-14 rounded-xl shrink-0 bg-border" />
        <div className="flex-1 flex flex-col gap-2 justify-center">
          <div className="h-3 w-2/3 rounded bg-border" />
          <div className="h-3 w-1/2 rounded bg-border" />
        </div>
      </div>
      <div className="h-9 rounded-xl bg-border" />
    </div>
  )
}

function DeliveryDetailsDrawer({ order, onClose }: { order: DispatchOrder; onClose: () => void }) {
  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-[55] bg-black/40"
      />
      <motion.div
        key="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[56] bg-card rounded-t-2xl max-w-xl mx-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', maxHeight: '80dvh', overflowY: 'auto' }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-4 pb-3 border-b border-border">
          <p className="text-base font-bold text-text">{order.listing.title}</p>
        </div>

        <div className="px-4 py-4 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Package size={16} strokeWidth={1.75} className="shrink-0 mt-0.5 text-text-subtle" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-text-subtle mb-1">Collect from</p>
              <p className="text-sm text-text leading-relaxed">
                {order.listing.pickup_address ?? order.listing.area ?? 'Address unavailable'}
              </p>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="flex items-start gap-3">
            <MapPin size={16} strokeWidth={1.75} className="shrink-0 mt-0.5 text-text-subtle" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-text-subtle mb-1">Deliver to</p>
              <p className="text-sm text-text leading-relaxed">
                {order.buyer_address ?? order.buyer_area ?? 'Address unavailable'}
              </p>
            </div>
          </div>

          {order.buyer_phone && (
            <>
              <div className="h-px bg-border" />
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${order.buyer_phone}`}
                  className="flex-1 flex items-center gap-2 rounded-xl bg-primary/8 px-3 py-2.5 hover:bg-primary/12 transition-colors"
                >
                  <Phone size={14} strokeWidth={2} className="text-primary shrink-0" />
                  <span className="text-sm font-semibold text-primary">Call buyer</span>
                  <span className="ml-auto text-xs font-mono text-text-muted">{order.buyer_phone}</span>
                </a>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(order.buyer_phone!).then(
                      () => toast.success('Phone number copied'),
                      () => toast.error('Could not copy — tap the number to copy manually'),
                    )
                  }
                  className="w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center shrink-0 hover:bg-surface transition-colors"
                >
                  <Copy size={14} strokeWidth={1.75} className="text-text-muted" />
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  )
}

function ActiveHeroCard({ order }: { order: DispatchOrder }) {
  const [code, setCode] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const { mutate: verify, isPending } = useVerifyDelivery()

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl border-2 border-primary/25 bg-card overflow-hidden"
      >
        <div className="h-1 bg-primary w-full" />

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full text-left p-4 pb-3"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
              <Clock size={10} strokeWidth={3} />
              Active Delivery
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
              In transit
            </span>
          </div>

          <div className="flex gap-3 mb-3">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-surface">
              {order.listing.images?.[0] ? (
                <ListingImage
                  src={order.listing.images[0]}
                  fill
                  sizes="64px"
                  className="object-cover"
                  alt={order.listing.title}
                />
              ) : (
                <Package size={18} strokeWidth={1.5} className="text-text-subtle" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-text truncate">{order.listing.title}</p>
              {order.buyer_name && (
                <p className="text-sm text-text-muted mt-0.5">{order.buyer_name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-surface border border-border px-3 py-2">
            <Package size={11} strokeWidth={2} className="shrink-0 text-text-subtle" />
            <span className="text-xs text-text-muted truncate">{order.listing.area ?? 'Pickup'}</span>
            <ArrowRight size={10} strokeWidth={2} className="shrink-0 text-text-subtle" />
            <span className="text-xs text-text-muted truncate flex-1">{order.buyer_area ?? 'Dropoff'}</span>
            <ChevronRight size={13} strokeWidth={2} className="shrink-0 text-text-subtle ml-1" />
          </div>
        </button>

        <div className="px-4 pb-4">
          <p className="text-xs text-text-subtle mb-3 mt-1">
            Ask the buyer for their 4-digit confirmation code when you arrive.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <KeyRound size={12} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-subtle" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="w-full rounded-xl border border-border bg-card pl-7 pr-3 py-2.5 text-sm font-mono tracking-widest text-text outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>
            <button
              type="button"
              onClick={() => verify({ id: order.id, code })}
              disabled={isPending || code.length !== 4}
              className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-success hover:bg-success/90 transition-opacity disabled:opacity-50"
            >
              {isPending ? '…' : 'Confirm'}
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isOpen && <DeliveryDetailsDrawer order={order} onClose={() => setIsOpen(false)} />}
      </AnimatePresence>
    </>
  )
}

function AvailableOrderCard({ order }: { order: DispatchOrder }) {
  const [isOpen, setIsOpen] = useState(false)
  const { mutate: claim, isPending } = useClaimOrder()

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full text-left p-4 pb-3"
        >
          <div className="flex gap-3 items-center mb-3">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-surface">
              {order.listing.images?.[0] ? (
                <ListingImage
                  src={order.listing.images[0]}
                  fill
                  sizes="56px"
                  className="object-cover"
                  alt={order.listing.title}
                />
              ) : (
                <Package size={16} strokeWidth={1.5} className="text-text-subtle" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text truncate">{order.listing.title}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-extrabold text-primary leading-none">
                ₦{order.delivery_fee.toLocaleString()}
              </p>
              <p className="text-[10px] mt-1 text-text-subtle font-medium">delivery fee</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-surface border border-border px-3 py-2">
            <Package size={11} strokeWidth={2} className="shrink-0 text-text-subtle" />
            <span className="text-xs text-text-muted truncate">{order.listing.area ?? 'Pickup'}</span>
            <ArrowRight size={10} strokeWidth={2} className="shrink-0 text-text-subtle" />
            <span className="text-xs text-text-muted truncate flex-1">{order.buyer_area ?? 'Dropoff'}</span>
            <ChevronRight size={13} strokeWidth={2} className="shrink-0 text-text-subtle ml-1" />
          </div>
        </button>

        <div className="px-4 pb-4">
          <Button
            size="sm"
            loading={isPending}
            disabled={isPending}
            onClick={() => claim(order.id)}
            className="w-full"
          >
            Claim delivery
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {isOpen && <DeliveryDetailsDrawer order={order} onClose={() => setIsOpen(false)} />}
      </AnimatePresence>
    </>
  )
}

export default function DispatchPortalPage() {
  const { data: available, isLoading: loadingAvailable } = useAvailableOrders()
  const { data: mine, isLoading: loadingMine } = useMyDeliveries()

  const activeCount = mine?.length ?? 0
  const availableCount = available?.length ?? 0

  return (
    <main className="min-h-screen bg-surface">
      <DispatchHeader />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Active delivery hero */}
        {loadingMine && <OrderSkeleton />}
        {!loadingMine && activeCount > 0 && (
          <div className="flex flex-col gap-3">
            {mine?.map((order) => <ActiveHeroCard key={order.id} order={order} />)}
          </div>
        )}
        {!loadingMine && activeCount === 0 && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-2">
            <Truck size={14} strokeWidth={1.75} className="text-text-subtle shrink-0" />
            <p className="text-sm text-text-subtle">Ready for your next job?</p>
          </div>
        )}

        {/* Available orders */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-subtle">
              Available Deliveries
            </h2>
            {availableCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success text-white text-[10px] font-bold">
                {availableCount}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {loadingAvailable && [1, 2, 3].map((i) => <OrderSkeleton key={i} />)}
            {!loadingAvailable && (!available || available.length === 0) && (
              <div className="py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4">
                  <Truck size={24} className="text-primary" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-semibold text-text mb-1">No deliveries available</p>
                <p className="text-xs text-text-subtle max-w-xs mx-auto">
                  Check back soon — new orders appear when sellers confirm shipment.
                </p>
              </div>
            )}
            {available?.map((order) => <AvailableOrderCard key={order.id} order={order} />)}
          </div>
        </div>
      </div>
    </main>
  )
}
