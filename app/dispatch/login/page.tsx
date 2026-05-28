'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, Truck, MapPin, CheckCircle2, ClipboardList } from 'lucide-react'
import { Input, Button } from '@/components/ui'

const DISPATCH_FEATURES = [
  {
    icon: ClipboardList,
    title: 'Claim delivery orders',
    desc: 'Pick up available orders in your area and start earning.',
  },
  {
    icon: MapPin,
    title: 'Manage active routes',
    desc: 'Track your in-progress deliveries in one place.',
  },
  {
    icon: CheckCircle2,
    title: 'Confirm drop-offs',
    desc: 'Verify delivery with a buyer code and close the loop.',
  },
]

function DispatchPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between h-full px-10 py-12 bg-primary relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/3" />
      </div>

      <div className="relative z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-light.svg" alt="declut" className="h-8" />
      </div>

      <div className="relative z-10 space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 mb-6">
          <Truck size={14} className="text-white" strokeWidth={2} />
          <span className="text-white text-xs font-semibold tracking-wide uppercase">Dispatcher Portal</span>
        </div>

        <div className="space-y-7">
          {DISPATCH_FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.title}
                className="flex items-start gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.1, duration: 0.4, ease: 'easeOut' }}
              >
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-white" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{f.title}</p>
                  <p className="text-white/65 text-sm leading-relaxed mt-0.5">{f.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <div className="relative z-10">
        <p className="text-white/40 text-xs">© {new Date().getFullYear()} Declut · Nigeria&apos;s secondhand marketplace</p>
      </div>
    </div>
  )
}

export default function DispatcherLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Login failed')
      if (json.data?.user?.account_type !== 'dispatcher') {
        throw new Error('This login is for dispatchers only. Use the main login page instead.')
      }
      router.push('/dispatch')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <DispatchPanel />

      <div className="flex items-center justify-center px-6 py-12 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile logo + badge */}
          <div className="flex flex-col items-center gap-3 mb-8 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="declut" className="h-9" />
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
              <Truck size={13} className="text-primary" strokeWidth={2} />
              <span className="text-primary text-xs font-semibold tracking-wide uppercase">Dispatcher Portal</span>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-card px-8 py-10">
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-text">Dispatcher sign in</h1>
                <p className="mt-1 text-sm text-text-muted">
                  Not a dispatcher?{' '}
                  <Link href="/auth/login" className="font-medium text-primary hover:text-primary-hover transition-colors">
                    Go to main login
                  </Link>
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                  name="email"
                  type="email"
                  label="Email address"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  leadingIcon={<Mail size={16} className="text-text-muted" />}
                />

                <Input
                  name="password"
                  type="password"
                  label="Password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Enter your password"
                  leadingIcon={<Lock size={16} className="text-text-muted" />}
                />

                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-lg bg-error-bg px-4 py-3 text-sm text-error"
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  type="submit"
                  size="md"
                  loading={loading}
                  disabled={loading}
                  className="w-full mt-2"
                >
                  Sign in
                </Button>
              </form>

              <p className="text-center text-sm text-text-muted">
                New dispatcher?{' '}
                <Link href="/dispatch/register" className="font-medium text-primary hover:text-primary-hover transition-colors">
                  Learn how to get access
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
