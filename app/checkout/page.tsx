'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Elements } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe-browser'
import CheckoutForm from '@/components/checkout/CheckoutForm'

function CheckoutSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-40 rounded-2xl border border-border bg-card animate-pulse" />
      <div className="h-12 rounded-xl bg-border animate-pulse" />
    </div>
  )
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const clientSecret = searchParams.get('client_secret')
  const [stripeReady, setStripeReady] = useState(false)

  useEffect(() => {
    getStripe().then(() => setStripeReady(true))
  }, [])

  if (!clientSecret) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="font-display text-2xl text-text mb-2">No active checkout</h2>
        <p className="text-text-muted text-sm mb-8">
          Your session may have expired. Return to your cart to try again.
        </p>
        <Link
          href="/cart"
          className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium hover:bg-card transition-colors"
        >
          Back to cart
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 items-start">
      {/* Left: context */}
      <div>
        <h1 className="font-display text-3xl font-bold text-text mb-2">Payment</h1>
        <p className="text-text-muted text-sm mb-8">
          Your order details are locked in. Complete payment below.
        </p>

        <div className="rounded-2xl border border-border bg-card p-5 mb-6 text-sm">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">
            Secure checkout
          </p>
          <ul className="space-y-1.5 text-text-muted">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
              256-bit SSL encryption
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
              Powered by Stripe
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
              Your card details are never stored
            </li>
          </ul>
        </div>
      </div>

      {/* Right: payment form */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-5">
          Card details
        </p>
        {stripeReady ? (
          <Elements stripe={getStripe()} options={{ clientSecret }}>
            <CheckoutForm onSuccess={() => router.push('/checkout/success')} />
          </Elements>
        ) : (
          <CheckoutSkeleton />
        )}
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10">
              <div>
                <div className="h-9 w-32 rounded-xl bg-border animate-pulse mb-4" />
                <div className="h-4 w-64 rounded bg-border animate-pulse mb-8" />
                <div className="h-32 rounded-2xl border border-border bg-card animate-pulse" />
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="space-y-4">
                  <div className="h-40 rounded-xl bg-border animate-pulse" />
                  <div className="h-12 rounded-xl bg-border animate-pulse" />
                </div>
              </div>
            </div>
          }
        >
          <CheckoutContent />
        </Suspense>
      </div>
    </main>
  )
}
