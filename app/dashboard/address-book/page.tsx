// app/dashboard/address-book/page.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Plus, Pencil, Trash2, Star, Loader2, BookMarked } from 'lucide-react'
import { Modal } from '@/components/ui'
import PlacesAddressInput, { type PlaceResult } from '@/components/checkout/PlacesAddressInput'
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
} from '@/lib/hooks/useAddresses'
import type { UserAddress } from '@/types'

const MAX_ADDRESSES = 10

const INPUT_CLS =
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors'

// ─── Add/Edit modal ───────────────────────────────────────────────────────────

function AddressForm({
  existing,
  onClose,
}: {
  existing?: UserAddress
  onClose: () => void
}) {
  const [label, setLabel] = useState(existing?.label ?? '')
  const [labelError, setLabelError] = useState('')
  const [selectedResult, setSelectedResult] = useState<PlaceResult | null>(null)
  const [addressError, setAddressError] = useState('')

  const { mutate: create, isPending: creating } = useCreateAddress()
  const { mutate: update, isPending: updating } = useUpdateAddress()
  const isPending = creating || updating

  function save() {
    let valid = true
    if (!label.trim()) { setLabelError('Label is required'); valid = false }
    if (!existing && !selectedResult) { setAddressError('Please search for and select an address'); valid = false }
    if (!valid) return

    if (existing) {
      const patch: Parameters<typeof update>[0] = { id: existing.id, label: label.trim() }
      if (selectedResult) {
        patch.address = selectedResult.formatted_address
        patch.address_state = selectedResult.state
      }
      update(patch, { onSuccess: onClose })
    } else {
      create(
        {
          label: label.trim(),
          address: selectedResult!.formatted_address,
          address_state: selectedResult!.state,
          is_default: false,
        },
        { onSuccess: onClose },
      )
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          Label <span className="text-error">*</span>
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => { setLabel(e.target.value); setLabelError('') }}
          maxLength={30}
          placeholder="e.g. Home, Office, Warehouse"
          autoFocus
          className={INPUT_CLS}
        />
        {labelError && <p className="mt-1.5 text-xs text-error">{labelError}</p>}
      </div>

      <PlacesAddressInput
        label="Address"
        placeholder="Search for an address"
        defaultValue={existing?.address ?? ''}
        onSelect={(r) => { setSelectedResult(r); setAddressError('') }}
        onClear={() => setSelectedResult(null)}
        error={addressError}
        required
      />

      <div className="flex gap-2.5 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-muted hover:bg-surface disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 size={13} strokeWidth={2.5} className="animate-spin" />}
          {isPending ? 'Saving…' : existing ? 'Save changes' : 'Add address'}
        </button>
      </div>
    </div>
  )
}

// ─── Address card ─────────────────────────────────────────────────────────────

function AddressCard({ addr }: { addr: UserAddress }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { mutate: update, isPending: settingDefault } = useUpdateAddress()
  const { mutate: del, isPending: deleting } = useDeleteAddress()

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-bold text-text">{addr.label}</p>
              {addr.is_default && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Star size={8} strokeWidth={2.5} />
                  Default
                </span>
              )}
            </div>
            <p className="text-sm text-text-muted leading-snug">{addr.address}</p>
            {addr.address_state && (
              <p className="text-xs text-text-subtle mt-0.5">{addr.address_state}</p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditOpen(true)}
              className="p-2 rounded-lg hover:bg-surface transition-colors text-text-muted hover:text-text"
              aria-label="Edit"
            >
              <Pencil size={14} strokeWidth={2} />
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="p-2 rounded-lg hover:bg-error/10 transition-colors text-text-muted hover:text-error"
              aria-label="Delete"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        {!addr.is_default && (
          <button
            onClick={() => update({ id: addr.id, is_default: true })}
            disabled={settingDefault}
            className="mt-3 text-xs font-semibold text-primary hover:text-primary-hover disabled:opacity-50 transition-colors inline-flex items-center gap-1"
          >
            {settingDefault ? <Loader2 size={10} className="animate-spin" /> : <Star size={10} strokeWidth={2.5} />}
            Set as default
          </button>
        )}
      </motion.div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit address">
        <AddressForm existing={addr} onClose={() => setEditOpen(false)} />
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete address">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Are you sure you want to delete <span className="font-semibold text-text">{addr.label}</span>? This cannot be undone.
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={() => setDeleteOpen(false)}
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-muted hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => del(addr.id, { onSuccess: () => setDeleteOpen(false) })}
              disabled={deleting}
              className="flex-1 rounded-xl bg-error px-4 py-2.5 text-sm font-semibold text-white hover:bg-error/90 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
            >
              {deleting && <Loader2 size={13} className="animate-spin" />}
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddressBookPage() {
  const [addOpen, setAddOpen] = useState(false)
  const { data: addresses = [], isLoading } = useAddresses()
  const atLimit = addresses.length >= MAX_ADDRESSES

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Address Book</h1>
          <p className="text-sm text-text-muted mt-1">Manage your saved pickup and delivery addresses.</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          disabled={atLimit}
          title={atLimit ? "You've reached the 10-address limit" : undefined}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Plus size={15} strokeWidth={2.5} />
          Add address
        </button>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin text-text-subtle" />
        </div>
      ) : addresses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-20 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-1">
            <BookMarked size={24} strokeWidth={1.5} className="text-primary" />
          </div>
          <p className="text-base font-semibold text-text">No saved addresses yet</p>
          <p className="text-sm text-text-muted max-w-xs">Add addresses you use for pickup or delivery so you can select them quickly when listing or buying.</p>
          <button
            onClick={() => setAddOpen(true)}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            <MapPin size={14} strokeWidth={2} />
            Add your first address
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3 max-w-lg">
          {addresses.map((addr) => (
            <AddressCard key={addr.id} addr={addr} />
          ))}
          {atLimit && (
            <p className="text-xs text-text-subtle text-center pt-1">
              10-address limit reached. Delete an address to add a new one.
            </p>
          )}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add address">
        <AddressForm onClose={() => setAddOpen(false)} />
      </Modal>
    </div>
  )
}
