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
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Truck size={22} className="text-primary" />
          <h1 className="text-xl font-bold text-text">Dispatchers</h1>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(null) }}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-primary"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add dispatcher
        </button>
      </div>

      {showForm && (
        <div className="bg-surface rounded-2xl shadow-card px-8 py-8 mb-8">
          <h2 className="text-base font-semibold text-text mb-5">New dispatcher account</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { key: 'name', label: 'Full name', icon: User, type: 'text', placeholder: 'Dispatcher name' },
              { key: 'email', label: 'Email address', icon: Mail, type: 'email', placeholder: 'dispatcher@example.com' },
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
                    className="w-full rounded-xl border border-border bg-card text-text pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            ))}
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={mutation.isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white bg-primary disabled:opacity-60">
                {mutation.isPending ? 'Creating…' : 'Create account'}
              </button>
              <button type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null) }}
                className="rounded-xl px-5 py-2.5 text-sm font-medium border border-border text-text-muted">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
        {isLoading ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">Loading…</p>
        ) : dispatchers.length === 0 ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">No dispatchers yet. Add one above.</p>
        ) : (
          <ul className="divide-y divide-border">
            {dispatchers.map((d) => (
              <li key={d.id} className="flex items-center gap-4 px-8 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shrink-0 bg-primary/10 text-primary">
                  {d.name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-text">{d.name}</p>
                  <p className="text-xs truncate text-text-muted">{d.email}</p>
                </div>
                <p className="ml-auto text-xs shrink-0 text-text-muted">
                  {new Date(d.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
