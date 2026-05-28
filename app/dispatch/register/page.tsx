import Link from 'next/link'

export default function DispatcherRegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="declut" className="h-9" />
        </div>

        <div className="bg-card rounded-2xl shadow-card px-8 py-10 text-center">
          <h1 className="text-xl font-bold mb-3" style={{ color: '#16130f' }}>Dispatcher accounts</h1>
          <p className="text-sm mb-6" style={{ color: '#78726c' }}>
            Dispatcher accounts are created by an administrator. Please contact your admin to get access.
          </p>
          <Link
            href="/dispatch/login"
            className="inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: '#4f46e5' }}
          >
            Go to login
          </Link>
        </div>
      </div>
    </div>
  )
}
