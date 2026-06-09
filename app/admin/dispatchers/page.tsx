'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Mail, Lock, Plus, Truck } from 'lucide-react'

interface Dispatcher {
  id: string
  name: string
  email: string
  created_at: string
}

async function fetchDispatchers(): Promise<Dispatcher[]> {
  const res = await fetch('/api/admin/dispatchers')
  if (!res.ok) throw new Error('Failed to load dispatchers')
  const json = await res.json()
  return json.data.dispatchers
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

const EMPTY_FORM = { name: '', email: '', password: '' }

export default function AdminDispatchersPage() {
  const queryClient = useQueryClient()
  const { data: dispatchers = [], isLoading } = useQuery({
    queryKey: ['admin', 'dispatchers'],
    queryFn: fetchDispatchers,
  })
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const mutation = useMutation({
    mutationFn: createDispatcher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'dispatchers'] })
      setForm(EMPTY_FORM)
      setFormError(null)
      setShowForm(false)
    },
    onError: (e: Error) => setFormError(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    mutation.mutate(form)
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
            <p className="text-xs text-text-muted mt-0.5">Add & manage dispatchers</p>
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
              { key: 'name',     label: 'Full name',          icon: User, type: 'text',     placeholder: 'Dispatcher name' },
              { key: 'email',    label: 'Email address',      icon: Mail, type: 'email',    placeholder: 'dispatcher@example.com' },
              { key: 'password', label: 'Temporary password', icon: Lock, type: 'password', placeholder: '8+ characters' },
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
              <button type="submit" disabled={mutation.isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover disabled:opacity-60 transition-colors">
                {mutation.isPending ? 'Creating…' : 'Create account'}
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
        {/* Dark header */}
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
                  <div className="h-3 bg-border rounded w-20" />
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
                  className="flex items-center gap-4 px-6 py-4 transition-all hover:bg-primary/[0.035] hover:[box-shadow:inset_4px_0_0_#3730a3]"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                    {d.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text truncate">{d.name}</p>
                    <p className="text-xs text-text-muted truncate">{d.email}</p>
                  </div>
                  <p className="text-xs shrink-0 text-text-subtle whitespace-nowrap">
                    {new Date(d.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
