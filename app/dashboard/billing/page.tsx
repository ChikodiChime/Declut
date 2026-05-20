'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type StripeStatus = 'connected' | 'pending' | 'not_connected'

function BillingContent() {
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')

  const [user, setUser] = useState<{ stripe_onboarding_complete: boolean } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((res) => setUser(res.data))
  }, [])

  const stripeStatus: StripeStatus =
    statusParam === 'connected' || user?.stripe_onboarding_complete
      ? 'connected'
      : statusParam === 'pending'
      ? 'pending'
      : 'not_connected'

  async function handleConnect() {
    setConnecting(true)
    setError('')
    const res = await fetch('/api/stripe/connect', { method: 'POST' })
    const data = await res.json()
    setConnecting(false)
    if (!res.ok) {
      setError(data.error?.message ?? 'Failed to start Stripe onboarding')
      return
    }
    window.location.href = data.data.url
  }

  return (
    <div className="mx-auto max-w-2xl py-10 px-4">
      <h1 className="text-2xl font-bold mb-2">Payments</h1>
      <p className="text-gray-500 mb-8 text-sm">
        Connect your Stripe account to list items for sale and receive payouts.
      </p>

      <div className="rounded-xl border p-6">
        {stripeStatus === 'connected' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="font-medium">Stripe account connected</span>
            </div>
            <p className="text-sm text-gray-500">
              You can list items for sale. Payouts are managed via your Stripe Express dashboard.
            </p>
          </>
        )}

        {stripeStatus === 'pending' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="font-medium">Onboarding incomplete</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              You started Stripe onboarding but didn&apos;t finish. Click below to complete it.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {connecting ? 'Loading...' : 'Complete Stripe onboarding'}
            </button>
          </>
        )}

        {stripeStatus === 'not_connected' && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="font-medium">Not connected</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Connect a Stripe account to start selling. Stripe handles payouts securely.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {connecting ? 'Loading...' : 'Connect Stripe'}
            </button>
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      <p className="mt-6 text-xs text-gray-400">
        The platform takes a 10% fee on each sale.{' '}
        <Link href="https://stripe.com/pricing" className="underline" target="_blank" rel="noopener noreferrer">
          Stripe pricing
        </Link>
      </p>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  )
}
