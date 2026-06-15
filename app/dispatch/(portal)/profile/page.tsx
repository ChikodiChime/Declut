'use client'

import { motion } from 'framer-motion'
import { Truck, Mail, User, Calendar } from 'lucide-react'
import { useMe, useSignOut } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui'

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.35 },
  }
}

function initials(name?: string | null): string {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-2xl p-6 h-28" style={{ background: '#1e1a15' }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 rounded bg-white/10" />
            <div className="h-3 w-48 rounded bg-white/10" />
            <div className="h-3 w-24 rounded bg-white/10" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl divide-y divide-border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <div className="w-8 h-8 rounded-lg bg-border shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-2.5 w-12 rounded bg-border" />
              <div className="h-3.5 w-36 rounded bg-border" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DispatchProfilePage() {
  const { data: user, isLoading } = useMe()
  const { mutate: signOut } = useSignOut('/dispatch/login')

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <main className="min-h-screen bg-surface">
      <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="declut" className="h-7" />
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            <Truck size={10} strokeWidth={2.5} />
            Dispatcher
          </span>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <ProfileSkeleton />
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl p-6"
              style={{
                background: 'linear-gradient(135deg, #16130f 0%, #1e1a15 60%, #252019 100%)',
                boxShadow: '0 4px 6px rgba(0,0,0,0.08), 0 20px 48px rgba(0,0,0,0.22)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-white">{initials(user?.name)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-white truncate">{user?.name ?? '—'}</p>
                  <p className="text-sm mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{user?.email ?? '—'}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Member since {memberSince}</p>
                </div>
              </div>
            </motion.div>

            <motion.section {...fadeUp(0.1)}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">
                Account
              </h2>
              <div className="bg-card rounded-xl divide-y divide-border">
                {[
                  { icon: User,     label: 'Name',         value: user?.name ?? '—' },
                  { icon: Mail,     label: 'Email',        value: user?.email ?? '—' },
                  { icon: Truck,    label: 'Account type', value: 'Dispatcher' },
                  { icon: Calendar, label: 'Member since', value: memberSince },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 px-5 py-4">
                    <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
                      <Icon size={15} strokeWidth={1.75} className="text-text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-muted">{label}</p>
                      <p className="text-sm font-medium text-text truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            <motion.div {...fadeUp(0.2)}>
              <Button
                variant="outline"
                size="md"
                onClick={() => signOut()}
                className="w-full"
              >
                Sign out
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </main>
  )
}
