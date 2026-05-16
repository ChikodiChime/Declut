'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Elements } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe-browser'
import CheckoutForm from '@/components/checkout/CheckoutForm'

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
      <div className="py-20 text-center">
        <p className="text-gray-500 mb-4">No active checkout session.</p>
        <a href="/cart" className="text-sm underline">Back to cart</a>
      </div>
    )
  }

  if (!stripeReady) {
    return <div className="py-20 text-center text-gray-400">Loading payment form...</div>
  }

  return (
    <div className="mx-auto max-w-md py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Payment</h1>
      <Elements stripe={getStripe()} options={{ clientSecret }}>
        <CheckoutForm onSuccess={() => router.push('/checkout/success')} />
      </Elements>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-400">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}
