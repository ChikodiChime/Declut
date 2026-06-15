'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wallet, CheckCircle, XCircle, Clock, Building2,
  CreditCard, CalendarDays, BadgeCheck, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminDrawer } from '@/components/admin/AdminDrawer'
import { SearchInput } from '@/components/admin/SearchInput'
import { FilterSelect } from '@/components/admin/FilterSelect'

// ─── Types ────────────────────────────────────────────────────────────────────

type BankSnapshot = {
  bank_name: string | null
  account_number: string | null
  account_name: string | null
  recipient_code: string | null
}

type Seller = {
  id: string
  name: string | null
  email: string
  account_type: string
  wallet_balance: number
  created_at: string
  paystack_onboarding_complete: boolean
}

type WithdrawalRequest = {
  id: string
  amount: number
  status: 'pending' | 'processed' | 'rejected'
  admin_note: string | null
  payment_reference: string | null
  requested_at: string
  processed_at: string | null
  bank_snapshot: BankSnapshot
  seller: Seller | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNaira(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function getInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchWithdrawals(type: 'seller' | 'dispatcher'): Promise<WithdrawalRequest[]> {
  const res = await fetch(`/api/admin/withdrawals?type=${type}`)
  if (!res.ok) throw new Error('Failed to load withdrawals')
  const json = await res.json()
  // Normalize dispatcher field to seller so existing UI works for both
  if (type === 'dispatcher') {
    return (json.data ?? []).map((r: WithdrawalRequest & { dispatcher?: Seller }) => ({
      ...r,
      seller: r.dispatcher ?? null,
    }))
  }
  return json.data
}

async function resolveRequest(
  id: string,
  action: 'process' | 'reject',
  opts: { note?: string; payment_reference?: string } = {}
) {
  const res = await fetch(`/api/admin/withdrawals/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...opts }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to update request')
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-400' },
  processed: { label: 'Processed', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  rejected:  { label: 'Rejected',  cls: 'bg-red-100 text-red-700',        dot: 'bg-red-500' },
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border animate-pulse">
          <td className="px-6 py-[18px]"><div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-full bg-border shrink-0" /><div className="space-y-1.5"><div className="h-4 rounded bg-border w-28" /><div className="h-3 rounded bg-border w-20" /></div></div></td>
          <td className="px-6 py-[18px]"><div className="h-4 rounded bg-border w-24" /><div className="h-3 rounded bg-border mt-1.5 w-32" /></td>
          <td className="px-6 py-[18px]"><div className="h-4 rounded bg-border w-20" /></td>
          <td className="px-6 py-[18px]"><div className="h-4 rounded bg-border w-20" /></td>
          <td className="px-6 py-[18px]"><div className="h-5 rounded-full bg-border w-20" /></td>
        </tr>
      ))}
    </>
  )
}

function CardSkeleton() {
  return (
    <div className="px-4 py-4 animate-pulse border-b border-border last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-border shrink-0" />
          <div><div className="h-4 rounded bg-border w-28" /><div className="h-3 rounded bg-border mt-1.5 w-36" /></div>
        </div>
        <div className="h-5 rounded-full bg-border w-16 shrink-0" />
      </div>
      <div className="h-12 rounded-lg bg-border mt-2.5" />
      <div className="flex items-center justify-between mt-2.5">
        <div><div className="h-5 rounded bg-border w-20" /><div className="h-3 rounded bg-border mt-1 w-16" /></div>
        <div className="h-5 rounded-full bg-border w-16" />
      </div>
    </div>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function WithdrawalDrawer({
  req,
  open,
  onClose,
  onProcess,
  onReject,
  isPending,
}: {
  req: WithdrawalRequest | null
  open: boolean
  onClose: () => void
  onProcess: (id: string, reference: string) => void
  onReject: (id: string, note: string) => void
  isPending: boolean
}) {
  const [mode, setMode] = useState<'idle' | 'processing' | 'rejecting'>('idle')
  const [paymentRef, setPaymentRef] = useState('')
  const [rejectNote, setRejectNote] = useState('')

  function handleClose() {
    setMode('idle')
    setPaymentRef('')
    setRejectNote('')
    onClose()
  }

  function handleProcessConfirm() {
    if (!req) return
    onProcess(req.id, paymentRef)
    setMode('idle')
    setPaymentRef('')
  }

  function handleRejectConfirm() {
    if (!req) return
    onReject(req.id, rejectNote)
    setMode('idle')
    setRejectNote('')
  }

  const seller = req?.seller ?? null
  const bank = req?.bank_snapshot
  const badge = req ? STATUS_STYLE[req.status] : null

  const heroContent = seller ? (
    <>
      {/* Seller identity */}
      <div className="flex items-center gap-3.5 mb-5">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '2px solid rgba(255,255,255,0.25)' }}
        >
          {getInitials(seller.name, seller.email)}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white leading-tight">{seller.name ?? '—'}</p>
          <p className="text-[13px] truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>{seller.email}</p>
        </div>
      </div>

      {/* Amount */}
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Withdrawal request
        </p>
        <p className="text-4xl font-bold text-white leading-none tracking-tight">
          {req ? formatNaira(req.amount) : '—'}
        </p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {badge && (
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        )}
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}
        >
          {seller.account_type.charAt(0).toUpperCase() + seller.account_type.slice(1)}
        </span>
        {seller.paystack_onboarding_complete && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7' }}
          >
            <BadgeCheck size={10} strokeWidth={2.5} />
            Bank verified
          </span>
        )}
        <span
          className="inline-flex items-center gap-1 text-[11px] ml-auto"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          <CalendarDays size={10} strokeWidth={1.75} />
          Joined {formatDate(seller.created_at)}
        </span>
      </div>
    </>
  ) : undefined

  const footerContent = req?.status === 'pending' ? (
    mode === 'idle' ? (
      <div className="flex gap-2.5">
        <button
          onClick={() => setMode('processing')}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl text-white text-sm font-bold py-3 transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}
        >
          <CheckCircle size={15} strokeWidth={2.5} />
          Mark as processed
        </button>
        <button
          onClick={() => setMode('rejecting')}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-bold px-5 py-3 hover:bg-red-100 transition-colors"
        >
          <XCircle size={15} strokeWidth={2.5} />
          Reject
        </button>
      </div>
    ) : mode === 'processing' ? (
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2">
            Payment reference <span className="font-normal normal-case">(optional — paste your Paystack or bank ref)</span>
          </label>
          <input
            type="text"
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="e.g. TRF-20240613-001 or Paystack transfer ID"
            autoFocus
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent transition-shadow font-mono"
          />
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => { setMode('idle'); setPaymentRef('') }}
            className="flex-1 rounded-xl border border-border text-sm font-semibold text-text-muted py-3 hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleProcessConfirm}
            disabled={isPending}
            className="flex-1 rounded-xl text-white text-sm font-bold py-3 disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}
          >
            {isPending ? 'Saving…' : 'Confirm processed'}
          </button>
        </div>
      </div>
    ) : (
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2">
            Rejection reason <span className="font-normal normal-case">(optional)</span>
          </label>
          <input
            type="text"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="e.g. Bank details mismatch"
            autoFocus
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent transition-shadow"
          />
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => { setMode('idle'); setRejectNote('') }}
            className="flex-1 rounded-xl border border-border text-sm font-semibold text-text-muted py-3 hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRejectConfirm}
            disabled={isPending}
            className="flex-1 rounded-xl text-white text-sm font-bold py-3 disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}
          >
            {isPending ? 'Rejecting…' : 'Confirm reject'}
          </button>
        </div>
      </div>
    )
  ) : undefined

  return (
    <AdminDrawer
      open={open}
      onClose={handleClose}
      label="Withdrawal details"
      hero={heroContent}
      footer={footerContent}
    >
      {req && seller && (
        <div className="px-6 py-5 space-y-4">

          {/* Wallet balance */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'linear-gradient(135deg, #f0f0ff 0%, #e8e6ff 100%)', border: '1px solid #c7c5f5' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Wallet size={12} strokeWidth={2} style={{ color: '#5b50db' }} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#7b72e0' }}>
                    Current wallet balance
                  </p>
                </div>
                <p className="text-2xl font-bold" style={{ color: '#2e2790' }}>
                  {formatNaira(seller.wallet_balance)}
                </p>
              </div>
              {req.status === 'pending' && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#9e98e8' }}>Before</p>
                  <p className="text-base font-bold" style={{ color: '#5b50db' }}>
                    {formatNaira(seller.wallet_balance + req.amount)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bank account */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-subtle mb-2.5">Bank account</p>
            <div className="rounded-2xl overflow-hidden border border-border bg-card">
              <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border">
                <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
                  <Building2 size={14} strokeWidth={1.75} className="text-text-subtle" />
                </div>
                <div>
                  <p className="text-[10px] text-text-subtle font-semibold uppercase tracking-widest">Bank</p>
                  <p className="text-sm font-semibold text-text mt-0.5">{bank?.bank_name ?? '—'}</p>
                </div>
              </div>
              <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border">
                <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
                  <CreditCard size={14} strokeWidth={1.75} className="text-text-subtle" />
                </div>
                <div>
                  <p className="text-[10px] text-text-subtle font-semibold uppercase tracking-widest">Account number</p>
                  <p className="text-sm font-bold text-text font-mono mt-0.5 tracking-wider">{bank?.account_number ?? '—'}</p>
                </div>
              </div>
              {bank?.account_name && (
                <div className="px-4 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
                    <BadgeCheck size={14} strokeWidth={1.75} className="text-text-subtle" />
                  </div>
                  <div>
                    <p className="text-[10px] text-text-subtle font-semibold uppercase tracking-widest">Account name</p>
                    <p className="text-sm font-semibold text-text mt-0.5">{bank.account_name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Request metadata */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-subtle mb-2.5">Details</p>
            <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-text-muted">Requested</span>
                <span className="text-sm font-medium text-text">{formatDate(req.requested_at)}</span>
              </div>
              {req.processed_at && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-text-muted">
                    {req.status === 'processed' ? 'Processed' : 'Rejected'}
                  </span>
                  <span className="text-sm font-medium text-text">{formatDate(req.processed_at)}</span>
                </div>
              )}
              {req.status === 'processed' && req.payment_reference && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-text-muted">Payment ref</span>
                  <span className="font-mono text-xs font-semibold text-text">{req.payment_reference}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-text-muted">Status</span>
                {badge && (
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                    {badge.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rejection note */}
          {req.status === 'rejected' && req.admin_note && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 flex items-start gap-3">
              <AlertCircle size={15} strokeWidth={2} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-[0.15em] mb-1">Rejection reason</p>
                <p className="text-sm text-red-700 leading-relaxed">{req.admin_note}</p>
              </div>
            </div>
          )}

          <div className="h-2" />
        </div>
      )}
    </AdminDrawer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const WITHDRAWAL_STATUS_FILTERS = [
  { value: '',          label: 'All statuses' },
  { value: 'pending',   label: 'Pending' },
  { value: 'processed', label: 'Processed' },
  { value: 'rejected',  label: 'Rejected' },
] as const

type WStatusFilter = typeof WITHDRAWAL_STATUS_FILTERS[number]['value']

export default function AdminWithdrawalsPage() {
  const queryClient  = useQueryClient()
  const searchParams = useSearchParams()
  const [search, setSearch]             = useState(() => searchParams.get('q') ?? '')
  const [statusFilter, setStatusFilter] = useState<WStatusFilter>('')
  const [selected, setSelected]         = useState<WithdrawalRequest | null>(null)
  const [type, setType]                 = useState<'seller' | 'dispatcher'>('seller')

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSearch(searchParams.get('q') ?? '') }, [searchParams])

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin', 'withdrawals', type],
    queryFn: () => fetchWithdrawals(type),
  })

  // Client-side filter (no pagination on withdrawals)
  const visible = requests.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const name  = r.seller?.name?.toLowerCase() ?? ''
      const email = r.seller?.email?.toLowerCase() ?? ''
      if (!name.includes(q) && !email.includes(q)) return false
    }
    return true
  })

  const processMutation = useMutation({
    mutationFn: ({ id, reference }: { id: string; reference: string }) =>
      resolveRequest(id, 'process', { payment_reference: reference }),
    onSuccess: () => {
      toast.success('Marked as processed')
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdrawals', type] })
      setSelected(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      resolveRequest(id, 'reject', { note }),
    onSuccess: () => {
      toast.success('Request rejected — funds returned to wallet')
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdrawals', type] })
      setSelected(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const pending = requests.filter((r) => r.status === 'pending').length
  const showing = visible.length

  const DARK_HEADER = { background: 'linear-gradient(135deg, #2e2b85 0%, #3730a3 100%)' }
  const TH = 'text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap'
  const TH_COLOR = { color: 'rgba(255,255,255,0.55)' }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
          <Wallet size={19} strokeWidth={1.75} className="text-violet-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text">Withdrawals</h1>
            {pending > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                {pending} pending
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">Click any request to review and take action</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-border mb-6">
        {(['seller', 'dispatcher'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`px-5 py-3 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
              type === t
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t === 'seller' ? 'Sellers' : 'Dispatchers'}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" />
        </div>
        <FilterSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as WStatusFilter)}
          options={WITHDRAWAL_STATUS_FILTERS}
        />
        {showing !== requests.length && (
          <span className="text-[11px] text-text-subtle shrink-0">{showing} of {requests.length}</span>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden shadow-elevated">

        {/* ── Desktop table ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={DARK_HEADER}>
                <th className={TH} style={TH_COLOR}>Seller</th>
                <th className={TH} style={TH_COLOR}>Bank</th>
                <th className={TH} style={TH_COLOR}>Amount</th>
                <th className={TH} style={TH_COLOR}>Requested</th>
                <th className={TH} style={TH_COLOR}>Status</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {isLoading ? (
                <TableSkeleton />
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center bg-card">
                    <div className="w-12 h-12 rounded-2xl bg-border/60 flex items-center justify-center mx-auto mb-3">
                      <Wallet size={22} strokeWidth={1.25} className="text-text-subtle" />
                    </div>
                    <p className="text-sm font-medium text-text-muted">No withdrawal requests found</p>
                  </td>
                </tr>
              ) : (
                visible.map((req) => {
                  const badge = STATUS_STYLE[req.status]
                  const bank = req.bank_snapshot
                  return (
                    <tr
                      key={req.id}
                      onClick={() => setSelected(req)}
                      className="cursor-pointer transition-all hover:bg-primary/[0.05] hover:[box-shadow:inset_4px_0_0_#3730a3]"
                    >
                      <td className="px-6 py-[18px]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[11px] font-bold text-slate-600">
                            {req.seller ? getInitials(req.seller.name, req.seller.email) : '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-text truncate">{req.seller?.name ?? '—'}</p>
                            <p className="text-xs text-text-muted truncate">{req.seller?.email ?? ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-[18px]">
                        <p className="font-semibold text-text">{bank.bank_name ?? '—'}</p>
                        <p className="text-xs text-text-muted font-mono mt-0.5">{bank.account_number ?? '—'}</p>
                      </td>
                      <td className="px-6 py-[18px] font-bold text-text whitespace-nowrap">{formatNaira(req.amount)}</td>
                      <td className="px-6 py-[18px] text-text-muted whitespace-nowrap">{formatDate(req.requested_at)}</td>
                      <td className="px-6 py-[18px]">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                          {req.status !== 'pending' && req.processed_at && (
                            <span className="flex items-center gap-1 text-[11px] text-text-subtle">
                              <Clock size={10} strokeWidth={2} />
                              {formatDate(req.processed_at)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile cards ── */}
        <div className="md:hidden">
          <div className="px-4 py-3" style={DARK_HEADER}>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={TH_COLOR}>Withdrawals</p>
          </div>
          <div className="bg-card divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : visible.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-border/60 flex items-center justify-center mx-auto mb-3">
                  <Wallet size={22} strokeWidth={1.25} className="text-text-subtle" />
                </div>
                <p className="text-sm font-medium text-text-muted">No withdrawal requests found</p>
              </div>
            ) : (
              visible.map((req) => {
                const badge = STATUS_STYLE[req.status]
                const bank = req.bank_snapshot
                return (
                  <div
                    key={req.id}
                    onClick={() => setSelected(req)}
                    className="cursor-pointer px-4 py-4 transition-colors hover:bg-primary/[0.05] active:bg-primary/[0.08]"
                  >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[11px] font-bold text-slate-600">
                            {req.seller ? getInitials(req.seller.name, req.seller.email) : '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-text text-sm truncate">{req.seller?.name ?? '—'}</p>
                            <p className="text-xs text-text-muted truncate">{req.seller?.email ?? ''}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${badge.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </div>

                      <div className="mt-2.5 bg-surface border border-border rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-text">{bank.bank_name ?? '—'}</p>
                        <p className="text-xs text-text-muted font-mono mt-0.5">
                          {bank.account_number ?? '—'}
                          {bank.account_name ? ` · ${bank.account_name}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2.5">
                        <div>
                          <p className="text-sm font-bold text-text">{formatNaira(req.amount)}</p>
                          <p className="text-[11px] text-text-subtle">{formatDate(req.requested_at)}</p>
                        </div>
                        <span className="text-[11px] text-text-subtle">Tap to review →</span>
                      </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <WithdrawalDrawer
        req={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onProcess={(id, reference) => processMutation.mutate({ id, reference })}
        onReject={(id, note) => rejectMutation.mutate({ id, note })}
        isPending={processMutation.isPending || rejectMutation.isPending}
      />
    </div>
  )
}
