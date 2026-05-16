"use client";

import { useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { clearSessionCart } from '@/lib/session-cart'

export default function CheckoutSuccessPage() {
  useEffect(() => {
    clearSessionCart()
    window.dispatchEvent(new Event('cart-updated'))
  }, [])

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success-bg mb-6">
            <CheckCircle size={32} className="text-success" strokeWidth={1.5} />
          </div>

          <h1 className="font-display text-3xl font-bold text-text mb-2">
            Payment successful
          </h1>
          <p className="text-text-muted text-sm max-w-sm mb-2">
            Your order has been placed. The seller will be in touch within 12 hours
            to arrange delivery or pickup.
          </p>
          <p className="text-text-subtle text-xs mb-10">
            A confirmation has been sent to your email.
          </p>

          <Link
            href="/listings"
            className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium hover:bg-card transition-colors"
          >
            Continue browsing
          </Link>
        </div>
      </div>
    </main>
  )
}
