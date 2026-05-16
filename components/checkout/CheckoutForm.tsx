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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="rounded-lg bg-black py-3 text-white font-medium disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Pay now'}
      </button>
    </form>
  )
}
