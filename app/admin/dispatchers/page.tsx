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
    <div className="min-h-screen bg-surface px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Truck size={22} style={{ color: '#4f46e5' }} />
            <h1 className="text-xl font-bold" style={{ color: '#16130f' }}>Dispatchers</h1>
          </div>
          <button
            onClick={() => { setShowForm(true); setFormError(null) }}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: '#4f46e5' }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Add dispatcher
          </button>
        </div>

        {showForm && (
          <div className="bg-card rounded-2xl shadow-card px-8 py-8 mb-8">
            <h2 className="text-base font-semibold mb-5" style={{ color: '#16130f' }}>New dispatcher account</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {[
                { key: 'name', label: 'Full name', icon: User, type: 'text', placeholder: 'Dispatcher name' },
                { key: 'email', label: 'Email address', icon: Mail, type: 'email', placeholder: 'dispatcher@example.com' },
                { key: 'password', label: 'Temporary password', icon: Lock, type: 'password', placeholder: '8+ characters' },
              ].map(({ key, label, icon: Icon, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#78726c' }}>{label}</label>
                  <div className="relative">
                    <Icon size={15} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a8a09a' }} />
                    <input
                      type={type}
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      required
                      className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2"
                      style={{ borderColor: '#e8e4dc', background: '#faf9f7', color: '#16130f' }}
                    />
                  </div>
                </div>
              ))}

              {formError && <p className="text-xs text-red-600">{formError}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: '#4f46e5' }}
                >
                  {mutation.isPending ? 'Creating…' : 'Create account'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null) }}
                  className="rounded-xl px-5 py-2.5 text-sm font-medium border"
                  style={{ borderColor: '#e8e4dc', color: '#78726c' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          {isLoading ? (
            <p className="px-8 py-10 text-sm text-center" style={{ color: '#a8a09a' }}>Loading…</p>
          ) : dispatchers.length === 0 ? (
            <p className="px-8 py-10 text-sm text-center" style={{ color: '#a8a09a' }}>No dispatchers yet. Add one above.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: '#f0ece4' }}>
              {dispatchers.map((d) => (
                <li key={d.id} className="flex items-center gap-4 px-8 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shrink-0"
                    style={{ background: '#ede9fe', color: '#4f46e5' }}>
                    {d.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#16130f' }}>{d.name}</p>
                    <p className="text-xs truncate" style={{ color: '#78726c' }}>{d.email}</p>
                  </div>
                  <p className="ml-auto text-xs shrink-0" style={{ color: '#a8a09a' }}>
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
