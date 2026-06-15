'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Truck, Plus, User, Mail, Lock, Phone, Calendar,
  Package, Pencil, X, Check, UserMinus, UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminDrawer } from '@/components/admin/AdminDrawer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Dispatcher {
  id: string
  name: string
  email: string
  phone: string | null
  suspended: boolean
  created_at: string
}

interface DispatcherDetail {
  dispatcher: Dispatcher
  deliveriesTotal: number
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchDispatchers(): Promise<Dispatcher[]> {
  const res = await fetch('/api/admin/dispatchers')
  if (!res.ok) throw new Error('Failed to load dispatchers')
  const json = await res.json()
  return json.data.dispatchers
}

async function fetchDispatcherDetail(id: string): Promise<DispatcherDetail> {
  const res = await fetch(`/api/admin/dispatchers/${id}`)
  if (!res.ok) throw new Error('Failed to load dispatcher')
  const json = await res.json()
  return json.data
}

async function createDispatcher(body: { name: string; email: string; password: string }) {
  const res = await fetch('/api/admin/dispatchers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to create dispatcher')
  return json.data.dispatcher as Dispatcher
}

async function updateDispatcher(id: string, updates: Partial<{ name: string; email: string; phone: string; suspended: boolean }>) {
  const res = await fetch(`/api/admin/dispatchers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to update dispatcher')
  return json.data.dispatcher as Dispatcher
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

// ─── Dispatcher Drawer ────────────────────────────────────────────────────────

function DispatcherDrawer({
  dispatcherId,
  onClose,
  onUpdated,
}: {
  dispatcherId: string | null
  onClose: () => void
  onUpdated: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dispatchers', dispatcherId, 'detail'],
    queryFn: () => fetchDispatcherDetail(dispatcherId!),
    enabled: !!dispatcherId,
  })

  const dispatcher = data?.dispatcher
  const deliveriesTotal = data?.deliveriesTotal ?? 0

  useEffect(() => {
    if (dispatcher) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({ name: dispatcher.name, email: dispatcher.email, phone: dispatcher.phone ?? '' })
      setEditing(false)
      setFormError(null)
    }
  }, [dispatcher])

  const updateMutation = useMutation({
    mutationFn: (updates: Parameters<typeof updateDispatcher>[1]) =>
      updateDispatcher(dispatcherId!, updates),
    onSuccess: () => {
      onUpdated()
      setEditing(false)
      setFormError(null)
      toast.success('Dispatcher updated')
    },
    onError: (e: Error) => setFormError(e.message),
  })

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!dispatcher) return
    setFormError(null)
    const updates: Parameters<typeof updateDispatcher>[1] = {}
    if (form.name !== dispatcher.name) updates.name = form.name
    if (form.email !== dispatcher.email) updates.email = form.email
    const newPhone = form.phone.trim() || null
    if (newPhone !== dispatcher.phone) updates.phone = form.phone.trim()
    if (Object.keys(updates).length === 0) { setEditing(false); return }
    updateMutation.mutate(updates)
  }

  function handleToggleSuspend() {
    if (!dispatcher) return
    updateMutation.mutate(
      { suspended: !dispatcher.suspended },
      {
        onSuccess: () => {
          onUpdated()
          toast.success(dispatcher.suspended ? 'Dispatcher reactivated' : 'Dispatcher deactivated')
        },
      },
    )
  }

  function handleClose() {
    setEditing(false)
    setFormError(null)
    onClose()
  }

  const heroContent = dispatcher ? (
    <>
      <div className="flex items-center gap-4 mb-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0"
          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
        >
          {getInitials(dispatcher.name)}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-white leading-snug truncate">{dispatcher.name}</p>
          <p className="text-[13px] truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>{dispatcher.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}
        >
          <Truck size={10} strokeWidth={2} />
          Dispatcher
        </span>
        {dispatcher.suspended ? (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-500/20 text-red-200">
            Deactivated
          </span>
        ) : (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-500/20 text-green-200">
            Active
          </span>
        )}
      </div>
    </>
  ) : undefined

  const footerContent = dispatcher ? (
    editing ? (
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => {
            setEditing(false)
            setForm({ name: dispatcher.name, email: dispatcher.email, phone: dispatcher.phone ?? '' })
            setFormError(null)
          }}
          className="flex-1 rounded-xl border border-border text-sm font-semibold text-text-muted py-3 hover:bg-surface transition-colors"
        >
          Cancel
        </button>
        <button
          form="dispatcher-edit-form"
          type="submit"
          disabled={updateMutation.isPending}
          className="flex-1 rounded-xl text-white text-sm font-bold py-3 disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #2e2b85 0%, #3730a3 100%)', boxShadow: '0 4px 14px rgba(55,48,163,0.3)' }}
        >
          {updateMutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    ) : (
      <div className="flex gap-2.5">
        <button
          onClick={() => setEditing(true)}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-text-muted py-3 hover:bg-surface transition-colors"
        >
          <Pencil size={13} strokeWidth={2} />
          Edit details
        </button>
        <button
          onClick={handleToggleSuspend}
          disabled={updateMutation.isPending}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold py-3 disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98] ${
            dispatcher.suspended
              ? 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
              : 'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
          }`}
        >
          {dispatcher.suspended
            ? <><Check size={13} strokeWidth={2.5} /> Reactivate</>
            : <><X size={13} strokeWidth={2.5} /> Deactivate</>
          }
        </button>
      </div>
    )
  ) : undefined

  return (
    <AdminDrawer
      open={!!dispatcherId}
      onClose={handleClose}
      label="Dispatcher details"
      hero={heroContent}
      footer={footerContent}
    >
      {isLoading && (
        <div className="px-6 py-6 space-y-4 animate-pulse">
          <div className="h-20 rounded-2xl bg-border" />
          <div className="h-32 rounded-2xl bg-border" />
        </div>
      )}

      {dispatcher && (
        <div className="px-6 py-5 space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
              <div className="flex items-center gap-2 mb-1">
                <Package size={13} strokeWidth={2} className="text-text-subtle" />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-subtle">Deliveries</p>
              </div>
              <p className="text-2xl font-bold text-text">{deliveriesTotal.toLocaleString('en-NG')}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={13} strokeWidth={2} className="text-text-subtle" />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-subtle">Joined</p>
              </div>
              <p className="text-sm font-semibold text-text leading-snug">{formatDate(dispatcher.created_at)}</p>
            </div>
          </div>

          {/* Edit form / Details card */}
          {editing ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-subtle mb-2.5">Edit details</p>
              <form id="dispatcher-edit-form" onSubmit={handleSave} className="space-y-3">
                {[
                  { key: 'name',  label: 'Full name',     icon: User,  type: 'text',  placeholder: 'Dispatcher name' },
                  { key: 'email', label: 'Email address', icon: Mail,  type: 'email', placeholder: 'dispatcher@example.com' },
                  { key: 'phone', label: 'Phone number',  icon: Phone, type: 'tel',   placeholder: '+234 …' },
                ].map(({ key, label, icon: Icon, type, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">{label}</label>
                    <div className="relative">
                      <Icon size={14} strokeWidth={1.8} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type={type}
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        required={key !== 'phone'}
                        className="w-full rounded-xl border border-border bg-surface text-text pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                      />
                    </div>
                  </div>
                ))}
                {formError && <p className="text-xs text-red-600 font-medium">{formError}</p>}
              </form>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-subtle mb-2.5">Details</p>
              <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
                <div className="px-4 py-3 flex items-center gap-3">
                  <User size={13} strokeWidth={2} className="text-text-subtle shrink-0" />
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="text-xs text-text-muted shrink-0">Name</span>
                    <span className="text-sm font-medium text-text truncate ml-4">{dispatcher.name}</span>
                  </div>
                </div>
                <div className="px-4 py-3 flex items-center gap-3">
                  <Mail size={13} strokeWidth={2} className="text-text-subtle shrink-0" />
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="text-xs text-text-muted shrink-0">Email</span>
                    <span className="text-sm text-text truncate ml-4">{dispatcher.email}</span>
                  </div>
                </div>
                <div className="px-4 py-3 flex items-center gap-3">
                  <Phone size={13} strokeWidth={2} className="text-text-subtle shrink-0" />
                  <div className="flex items-center justify-between flex-1">
                    <span className="text-xs text-text-muted">Phone</span>
                    <span className="text-sm text-text">{dispatcher.phone ?? <span className="text-text-subtle italic text-xs">Not set</span>}</span>
                  </div>
                </div>
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

const EMPTY_FORM = { name: '', email: '', password: '' }

export default function AdminDispatchersPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: dispatchers = [], isLoading } = useQuery({
    queryKey: ['admin', 'dispatchers'],
    queryFn: fetchDispatchers,
  })

  const createMutation = useMutation({
    mutationFn: createDispatcher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'dispatchers'] })
      setForm(EMPTY_FORM)
      setFormError(null)
      setShowForm(false)
      toast.success('Dispatcher account created')
    },
    onError: (e: Error) => setFormError(e.message),
  })

  const suspendMutation = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      updateDispatcher(id, { suspended }),
    onMutate: async ({ id, suspended }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'dispatchers'] })
      const previous = queryClient.getQueryData<Dispatcher[]>(['admin', 'dispatchers'])
      queryClient.setQueryData<Dispatcher[]>(['admin', 'dispatchers'], (old) =>
        old?.map((d) => (d.id === id ? { ...d, suspended } : d)) ?? []
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(['admin', 'dispatchers'], ctx?.previous)
    },
    onSuccess: (_updated, { suspended }) => {
      toast.success(suspended ? 'Dispatcher deactivated' : 'Dispatcher reactivated')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'dispatchers'] }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    createMutation.mutate(form)
  }

  function handleDrawerUpdated() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'dispatchers'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'dispatchers', selectedId, 'detail'] })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Truck size={19} strokeWidth={1.75} className="text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text">Dispatchers</h1>
              {dispatchers.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {dispatchers.length}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">Click any dispatcher to view details</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(null) }}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add dispatcher
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border shadow-card px-8 py-7 mb-6">
          <h2 className="text-base font-semibold text-text mb-5">New dispatcher account</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { key: 'name',     label: 'Full name',          icon: User,  type: 'text',     placeholder: 'Dispatcher name' },
              { key: 'email',    label: 'Email address',      icon: Mail,  type: 'email',    placeholder: 'dispatcher@example.com' },
              { key: 'password', label: 'Temporary password', icon: Lock,  type: 'password', placeholder: '8+ characters' },
            ].map(({ key, label, icon: Icon, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1.5 text-text-muted">{label}</label>
                <div className="relative">
                  <Icon size={15} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    required
                    className="w-full rounded-xl border border-border bg-surface text-text pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                  />
                </div>
              </div>
            ))}
            {formError && <p className="text-xs text-red-600 font-medium">{formError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={createMutation.isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover disabled:opacity-60 transition-colors">
                {createMutation.isPending ? 'Creating…' : 'Create account'}
              </button>
              <button type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null) }}
                className="rounded-xl px-5 py-2.5 text-sm font-medium border border-border text-text-muted hover:bg-surface transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden shadow-elevated">
        <div
          className="px-6 py-4 flex items-center"
          style={{ background: 'linear-gradient(135deg, #2e2b85 0%, #3730a3 100%)' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Dispatcher accounts
          </p>
        </div>

        <div className="bg-card">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-border shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 bg-border rounded w-40" />
                    <div className="h-3 bg-border rounded w-52" />
                  </div>
                  <div className="h-5 bg-border rounded-full w-16" />
                </div>
              ))}
            </div>
          ) : dispatchers.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-border/60 flex items-center justify-center mx-auto mb-3">
                <Truck size={22} strokeWidth={1.25} className="text-text-subtle" />
              </div>
              <p className="text-sm font-medium text-text-muted">No dispatchers yet</p>
              <p className="text-xs text-text-subtle mt-1">Add one using the button above</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {dispatchers.map((d) => (
                <li
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className="cursor-pointer flex items-center gap-4 px-6 py-4 transition-all hover:bg-primary/[0.035] hover:[box-shadow:inset_4px_0_0_#3730a3] group"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${d.suspended ? 'bg-surface text-text-subtle' : 'bg-primary/10 text-primary'}`}>
                    {d.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${d.suspended ? 'text-text-muted' : 'text-text'}`}>
                      {d.name}
                    </p>
                    <p className="text-xs text-text-muted truncate">{d.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedId(d.id) }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-muted hover:bg-surface hover:text-text transition-colors"
                    >
                      <Pencil size={11} strokeWidth={2} />
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); suspendMutation.mutate({ id: d.id, suspended: !d.suspended }) }}
                      disabled={suspendMutation.isPending}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                        d.suspended
                          ? 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                          : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      {d.suspended
                        ? <><UserCheck size={11} strokeWidth={2} /> Reactivate</>
                        : <><UserMinus size={11} strokeWidth={2} /> Deactivate</>}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <DispatcherDrawer
        dispatcherId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={handleDrawerUpdated}
      />
    </div>
  )
}
