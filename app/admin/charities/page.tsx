'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, Plus, Pencil, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui'
import { toast } from 'sonner'

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

async function toggleCharityActive(id: string, active: boolean): Promise<Charity> {
  const res = await fetch(`/api/admin/charities/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
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
  const [modalOpen, setModalOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: createCharity,
    onSuccess: () => { invalidate(); closeModal() },
    onError: (e: Error) => setFormError(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string; description: string } }) => updateCharity(id, body),
    onSuccess: () => { invalidate(); closeModal() },
    onError: (e: Error) => setFormError(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCharity,
    onSuccess: () => { invalidate(); setDeletingId(null) },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleCharityActive(id, active),
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'charities'] })
      const previous = queryClient.getQueryData<Charity[]>(['admin', 'charities'])
      queryClient.setQueryData<Charity[]>(['admin', 'charities'], (old) =>
        old?.map((c) => (c.id === id ? { ...c, active } : c)) ?? []
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(['admin', 'charities'], ctx?.previous)
    },
    onSuccess: (updated) => {
      toast.success(updated.active ? 'Charity activated' : 'Charity deactivated')
    },
    onSettled: () => invalidate(),
  })

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(c: Charity) {
    setEditingId(c.id)
    setForm({ name: c.name, description: c.description ?? '' })
    setFormError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (editingId) {
      updateMutation.mutate({ id: editingId, body: form })
    } else {
      createMutation.mutate(form)
    }
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
            <p className="text-xs text-text-muted mt-0.5">Manage donation recipients</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add charity
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-elevated">
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
                    <div className="w-9 h-5 bg-border rounded-full" />
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
                  className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-primary/[0.035] ${!c.active ? 'opacity-60' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text">{c.name}</p>
                    {c.description && (
                      <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{c.description}</p>
                    )}
                  </div>

                  {deletingId === c.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-text-muted">Delete?</span>
                      <button
                        onClick={() => deleteMutation.mutate(c.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        {deleteMutation.isPending ? 'Deleting…' : 'Yes, delete'}
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium border border-border text-text-muted hover:bg-surface transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openEdit(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-muted hover:bg-surface hover:text-text transition-colors"
                      >
                        <Pencil size={11} strokeWidth={2} />
                        Edit
                      </button>
                      <button
                        onClick={() => toggleMutation.mutate({ id: c.id, active: !c.active })}
                        disabled={toggleMutation.isPending}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                          c.active
                            ? 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                            : 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {c.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setDeletingId(c.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={11} strokeWidth={2} />
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit charity' : 'Add charity'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-text-muted">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Charity name"
              required
              autoFocus
              className="w-full rounded-xl border border-border bg-surface text-text px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-text-muted">Description <span className="font-normal">(optional)</span></label>
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
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover disabled:opacity-60 transition-colors"
            >
              {isPending ? 'Saving…' : editingId ? 'Save changes' : 'Add charity'}
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl px-5 py-2.5 text-sm font-medium border border-border text-text-muted hover:bg-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
