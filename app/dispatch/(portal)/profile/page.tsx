'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Truck, Mail, User, Calendar, Building2, X, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { useMe, useSignOut } from '@/lib/hooks/useAuth'
import { useDispatchWallet } from '@/lib/hooks/useDispatchWallet'
import { Button } from '@/components/ui'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

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

type Bank = { name: string; code: string }

function BankSetupDrawer({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'select-bank' | 'account-number'>('select-bank')
  const [banks, setBanks] = useState<Bank[]>([])
  const [banksLoading, setBanksLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null)
  const [accountNumber, setAccountNumber] = useState('')
  const [resolvedName, setResolvedName] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    fetch('/api/paystack/banks')
      .then((r) => r.json())
      .then((j) => { setBanks(j.data ?? []); setBanksLoading(false) })
      .catch(() => { setBanksLoading(false) })
  }, [])

  useEffect(() => {
    if (accountNumber.length === 10 && selectedBank) {
      setResolving(true)
      setResolveError(null)
      setResolvedName(null)
      fetch(`/api/paystack/resolve-account?account_number=${accountNumber}&bank_code=${selectedBank.code}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.data?.account_name) {
            setResolvedName(j.data.account_name)
          } else {
            setResolveError('Could not verify account. Check the number and try again.')
          }
        })
        .catch(() => setResolveError('Could not verify account. Check your connection.'))
        .finally(() => setResolving(false))
    } else {
      setResolvedName(null)
      setResolveError(null)
    }
  }, [accountNumber, selectedBank])

  async function handleSave() {
    if (!selectedBank || !resolvedName) return
    setSaving(true)
    try {
      const res = await fetch('/api/paystack/recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_code: selectedBank.code,
          bank_name: selectedBank.name,
          account_number: accountNumber,
          account_name: resolvedName,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to save bank account')
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'wallet'] })
      toast.success('Bank account saved')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save bank account')
    } finally {
      setSaving(false)
    }
  }

  const filteredBanks = banks.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-[55] bg-black/40"
      />
      <motion.div
        key="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[56] bg-card rounded-t-2xl max-w-xl mx-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 py-4 border-b border-border flex items-center gap-3 shrink-0">
          {step !== 'select-bank' && (
            <button
              type="button"
              onClick={() => setStep('select-bank')}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-surface text-text-muted hover:text-text transition-colors"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
          )}
          <h2 className="text-base font-bold text-text flex-1">
            {step === 'select-bank' ? 'Select bank' : 'Account number'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-surface text-text-muted hover:text-text transition-colors"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 'select-bank' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search banks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {banksLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-text-muted" />
                </div>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
                  {filteredBanks.map((bank) => (
                    <button
                      key={bank.code}
                      type="button"
                      onClick={() => { setSelectedBank(bank); setStep('account-number') }}
                      className="w-full text-left px-4 py-3.5 text-sm font-medium text-text hover:bg-card transition-colors"
                    >
                      {bank.name}
                    </button>
                  ))}
                  {filteredBanks.length === 0 && (
                    <p className="px-4 py-6 text-sm text-text-subtle text-center">No banks found</p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 'account-number' && selectedBank && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface px-4 py-3">
                <p className="text-xs text-text-muted mb-0.5">Selected bank</p>
                <p className="text-sm font-semibold text-text">{selectedBank.name}</p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-text-muted block mb-2">
                  Account number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0000000000"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base font-semibold text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {resolving && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Loader2 size={14} className="animate-spin" />
                  Verifying account…
                </div>
              )}

              {resolvedName && (
                <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/8 px-4 py-3">
                  <CheckCircle2 size={16} className="text-success shrink-0" strokeWidth={2} />
                  <div>
                    <p className="text-xs text-text-muted">Account name</p>
                    <p className="text-sm font-semibold text-text">{resolvedName}</p>
                  </div>
                </div>
              )}

              {resolveError && (
                <p className="text-sm text-destructive">{resolveError}</p>
              )}

              {resolvedName && (
                <Button size="md" onClick={handleSave} loading={saving} disabled={saving} className="w-full">
                  Save bank account
                </Button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}

function BankAccountSection() {
  const { data: wallet, isLoading } = useDispatchWallet()
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl px-5 py-4 animate-pulse">
        <div className="h-3 w-24 rounded bg-border mb-2" />
        <div className="h-4 w-40 rounded bg-border" />
      </div>
    )
  }

  const hasBank = wallet?.paystack_onboarding_complete

  return (
    <>
      <motion.section {...fadeUp(0.15)}>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">
          Bank account
        </h2>
        <div className="bg-card rounded-xl px-5 py-4 flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
            <Building2 size={15} strokeWidth={1.75} className="text-text-muted" />
          </div>
          {hasBank && wallet ? (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text truncate">{wallet.paystack_account_name}</p>
              <p className="text-xs text-text-muted truncate">
                {wallet.paystack_bank_name} · ••••{wallet.paystack_account_number?.slice(-4)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-muted flex-1">No bank account added</p>
          )}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="text-xs font-semibold text-primary hover:underline shrink-0"
          >
            {hasBank ? 'Update' : 'Add'}
          </button>
        </div>
      </motion.section>

      <AnimatePresence>
        {drawerOpen && (
          <BankSetupDrawer onClose={() => setDrawerOpen(false)} />
        )}
      </AnimatePresence>
    </>
  )
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
          <img src="/logo.svg" alt="Unstash" className="h-7" />
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

            <BankAccountSection />

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
