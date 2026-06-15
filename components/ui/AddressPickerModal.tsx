// components/ui/AddressPickerModal.tsx
'use client'

import { useState } from 'react'
import { Check, MapPin, Plus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Modal } from './Modal'
import PlacesAddressInput, { type PlaceResult } from '@/components/checkout/PlacesAddressInput'
import { useAddresses, useCreateAddress } from '@/lib/hooks/useAddresses'
import type { UserAddress } from '@/types'

const MAX_ADDRESSES = 10

type Props = {
  open: boolean
  onClose: () => void
  title: string
  currentAddress?: string | null
  onConfirm: (address: string, state: string | null) => void
}

function AddressCard({
  addr,
  selected,
  onSelect,
}: {
  addr: UserAddress
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'w-full text-left rounded-xl border-2 px-4 py-3 transition-all duration-150',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:border-border-strong',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-text'}`}>
              {addr.label}
            </span>
            {addr.is_default && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Default
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted leading-snug">{addr.address}</p>
          {addr.address_state && (
            <p className="text-[11px] text-text-subtle mt-0.5">{addr.address_state}</p>
          )}
        </div>
        {selected && (
          <div className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
            <Check size={11} strokeWidth={3} className="text-white" />
          </div>
        )}
      </div>
    </button>
  )
}

export function AddressPickerModal({ open, onClose, title, currentAddress, onConfirm }: Props) {
  const { data: addresses = [], isLoading } = useAddresses()
  const { mutate: createAddress, isPending: saving } = useCreateAddress()

  const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0] ?? null
  const initialSelected = addresses.find((a) => a.address === currentAddress) ?? defaultAddr

  const [selectedId, setSelectedId] = useState<string | null>(initialSelected?.id ?? null)
  const [showNew, setShowNew] = useState(addresses.length === 0)
  const [newResult, setNewResult] = useState<PlaceResult | null>(null)
  const [saveToBook, setSaveToBook] = useState(addresses.length < MAX_ADDRESSES)
  const [newLabel, setNewLabel] = useState('Home')
  const [labelError, setLabelError] = useState('')

  const INPUT_CLS =
    'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors'

  function handleConfirm() {
    if (selectedId) {
      const addr = addresses.find((a) => a.id === selectedId)
      if (addr) onConfirm(addr.address, addr.address_state)
      onClose()
      return
    }
    if (newResult) {
      if (saveToBook) {
        if (!newLabel.trim()) { setLabelError('Label is required'); return }
        createAddress(
          { label: newLabel.trim(), address: newResult.formatted_address, address_state: newResult.state, is_default: false },
          {
            onSuccess: () => {
              onConfirm(newResult.formatted_address, newResult.state)
              onClose()
            },
          },
        )
      } else {
        onConfirm(newResult.formatted_address, newResult.state)
        onClose()
      }
    }
  }

  const canConfirm = Boolean(selectedId) || Boolean(newResult)

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-text-subtle" />
          </div>
        ) : (
          <>
            {addresses.length > 0 && (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <AddressCard
                    key={addr.id}
                    addr={addr}
                    selected={selectedId === addr.id}
                    onSelect={() => { setSelectedId(addr.id); setNewResult(null) }}
                  />
                ))}
              </div>
            )}

            {/* Use a different address */}
            <div className="rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => { setShowNew((v) => !v); setSelectedId(null) }}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text hover:bg-surface transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Plus size={14} strokeWidth={2.5} />
                  {addresses.length === 0 ? 'Enter an address' : 'Use a different address'}
                </span>
                {showNew ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
              </button>

              {showNew && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  <PlacesAddressInput
                    placeholder="Search for an address"
                    onSelect={(r) => { setNewResult(r); setSelectedId(null) }}
                    onClear={() => setNewResult(null)}
                  />

                  {newResult && addresses.length < MAX_ADDRESSES && (
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveToBook}
                        onChange={(e) => setSaveToBook(e.target.checked)}
                        className="rounded border-border text-primary"
                      />
                      <span className="text-sm text-text">Save to address book</span>
                    </label>
                  )}

                  {newResult && saveToBook && (
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">
                        Label <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        value={newLabel}
                        onChange={(e) => { setNewLabel(e.target.value); setLabelError('') }}
                        maxLength={30}
                        placeholder="e.g. Home, Office"
                        className={INPUT_CLS}
                      />
                      {labelError && <p className="mt-1 text-xs text-error">{labelError}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirm button */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm || saving}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={13} strokeWidth={2.5} className="animate-spin" />}
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
