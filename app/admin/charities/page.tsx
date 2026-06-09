'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, Plus, Pencil, Trash2 } from 'lucide-react'

interface Charity {
  id: string
  name: string
  description: string | null
  active: boolean
}

async function fetchCharities(): Promise<Charity[]> {
  const res = await fetch('/api/admin/charities')
  if (!res.ok) throw new Error('Failed to load charities')
  const json = await res.json()
  return json.data.charities
}

async function createCharity(body: { name: string; description: string }): Promise<Charity> {
  const res = await fetch('/api/admin/charities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to create charity')
  return json.data.charity
}

async function updateCharity(id: string, body: { name: string; description: string }): Promise<Charity> {
  const res = await fetch(`/api/admin/charities/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to update charity')
  return json.data.charity
}

async function deleteCharity(id: string) {
  const res = await fetch(`/api/admin/charities/${id}`, { method: 'DELETE' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to delete charity')
}

const EMPTY_FORM = { name: '', description: '' }

export default function AdminCharitiesPage() {
  const queryClient = useQueryClient()
  const { data: charities = [], isLoading } = useQuery({ queryKey: ['admin', 'charities'], queryFn: fetchCharities })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'charities'] })

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: createCharity,
    onSuccess: () => { invalidate(); setForm(EMPTY_FORM); setShowForm(false); setFormError(null) },
    onError: (e: Error) => setFormError(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string; description: string } }) => updateCharity(id, body),
    onSuccess: () => { invalidate(); setEditingId(null); setForm(EMPTY_FORM); setShowForm(false); setFormError(null) },
    onError: (e: Error) => setFormError(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCharity,
    onSuccess: invalidate,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (editingId) {
      updateMutation.mutate({ id: editingId, body: form })
    } else {
      createMutation.mutate(form)
    }
  }

  function startEdit(c: Charity) {
    setEditingId(c.id)
    setForm({ name: c.name, description: c.description ?? '' })
    setShowForm(true)
    setFormError(null)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
            <Heart size={19} strokeWidth={1.75} className="text-rose-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text">Charities</h1>
              {charities.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600">
                  {charities.length}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">CRUD donation recipients</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover transition-colors"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add charity
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border shadow-card px-8 py-7 mb-6">
          <h2 className="text-base font-semibold text-text mb-5">
            {editingId ? 'Edit charity' : 'New charity'}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-text-muted">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Charity name"
                required
                className="w-full rounded-xl border border-border bg-surface text-text px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-text-muted">Description (optional)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of the charity"
                rows={3}
                className="w-full rounded-xl border border-border bg-surface text-text px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all resize-none"
              />
            </div>
            {formError && <p className="text-xs text-red-600 font-medium">{formError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover disabled:opacity-60 transition-colors">
                {isPending ? 'Saving…' : editingId ? 'Save changes' : 'Add charity'}
              </button>
              <button type="button" onClick={cancelForm}
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
          className="px-6 py-4"
          style={{ background: 'linear-gradient(135deg, #2e2b85 0%, #3730a3 100%)' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Registered recipients
          </p>
        </div>

        <div className="bg-card">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 px-6 py-5 animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-border rounded w-48" />
                    <div className="h-3 bg-border rounded w-72" />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <div className="w-7 h-7 bg-border rounded-lg" />
                    <div className="w-7 h-7 bg-border rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : charities.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-border/60 flex items-center justify-center mx-auto mb-3">
                <Heart size={22} strokeWidth={1.25} className="text-text-subtle" />
              </div>
              <p className="text-sm font-medium text-text-muted">No charities yet</p>
              <p className="text-xs text-text-subtle mt-1">Add one using the button above</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {charities.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-4 px-6 py-4 transition-all hover:bg-primary/[0.035] hover:[box-shadow:inset_4px_0_0_#3730a3] group"
                >
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-text">{c.name}</p>
                    {c.description && (
                      <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{c.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(c)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-text-subtle hover:text-primary transition-colors"
                    >
                      <Pencil size={14} strokeWidth={1.75} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete "${c.name}"?`)) deleteMutation.mutate(c.id) }}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-text-subtle hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
