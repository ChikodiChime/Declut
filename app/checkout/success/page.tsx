import Link from 'next/link'

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto max-w-md py-20 px-4 text-center">
      <div className="text-4xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold mb-2">Payment successful!</h1>
      <p className="text-gray-500 mb-8 text-sm">
        Your order has been placed. The seller will respond within 12 hours.
        You&apos;ll find your orders in your dashboard.
      </p>
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg bg-black py-3 px-6 text-white font-medium text-sm"
        >
          View my orders
        </Link>
        <Link href="/listings" className="text-sm text-gray-500 underline">
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
