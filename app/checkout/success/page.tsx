import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

export default function CheckoutSuccessPage() {
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
          <p className="text-text-muted text-sm max-w-sm mb-10">
            Your order has been placed. The seller will respond within 12 hours.
            You&apos;ll find your orders in your dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-foreground text-white px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              View my orders
            </Link>
            <Link
              href="/listings"
              className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium hover:bg-card transition-colors"
            >
              Continue browsing
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
