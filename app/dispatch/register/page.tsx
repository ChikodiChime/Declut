import Link from 'next/link'
import { Truck, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui'

export default function DispatcherRegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="declut" className="h-9" />
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
            <Truck size={13} className="text-primary" strokeWidth={2} />
            <span className="text-primary text-xs font-semibold tracking-wide uppercase">Dispatcher Portal</span>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-card px-5 py-8 sm:px-8 sm:py-10 text-center">
          <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck size={28} className="text-primary" strokeWidth={1.75} />
          </div>

          <h1 className="text-xl font-bold text-text mb-2">Dispatcher accounts</h1>
          <p className="text-sm text-text-muted leading-relaxed mb-6">
            Dispatcher accounts are created by an administrator. Please contact your admin to get access, then sign in below.
          </p>

          <Button href="/dispatch/login" size="md" className="w-full">
            Go to sign in
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-text-subtle">
          © {new Date().getFullYear()} Declut · Dispatcher Portal
        </p>
      </div>
    </div>
  )
}
