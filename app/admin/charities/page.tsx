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
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Heart size={22} className="text-primary" />
          <h1 className="text-xl font-bold text-text">Charities</h1>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-primary"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add charity
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-surface rounded-2xl shadow-card px-8 py-8 mb-8">
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
                className="w-full rounded-xl border border-border bg-card text-text px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-text-muted">Description (optional)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description"
                rows={3}
                className="w-full rounded-xl border border-border bg-card text-text px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white bg-primary disabled:opacity-60">
                {isPending ? 'Saving…' : editingId ? 'Save changes' : 'Add charity'}
              </button>
              <button type="button" onClick={cancelForm}
                className="rounded-xl px-5 py-2.5 text-sm font-medium border border-border text-text-muted">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-card overflow-hidden">
        {isLoading ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">Loading…</p>
        ) : charities.length === 0 ? (
          <p className="px-8 py-10 text-sm text-center text-text-muted">No charities yet. Add one above.</p>
        ) : (
          <ul className="divide-y divide-border">
            {charities.map((c) => (
              <li key={c.id} className="flex items-start gap-4 px-8 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">{c.name}</p>
                  {c.description && <p className="text-xs text-text-muted mt-0.5">{c.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <button onClick={() => startEdit(c)}
                    className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-primary transition-colors">
                    <Pencil size={14} strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete "${c.name}"?`)) deleteMutation.mutate(c.id) }}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-red-600 transition-colors disabled:opacity-50">
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
