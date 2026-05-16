'use client'

import { useState } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

type Props = {
  onSuccess: () => void
}

export default function CheckoutForm({ onSuccess }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError('')

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout/success` },
    })

    setLoading(false)

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed, please try again')
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {error && (
        <p className="text-sm text-error text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full rounded-xl bg-foreground text-white py-3.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? 'Processing…' : 'Pay now'}
      </button>
    </form>
  )
}
