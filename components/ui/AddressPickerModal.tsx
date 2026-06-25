'use client'

import { useState } from 'react'
import { Check, MapPin, Plus, X, Loader2 } from 'lucide-react'
import { Modal } from './Modal'
import PlacesAddressInput, { type PlaceResult } from '@/components/checkout/PlacesAddressInput'
import { useAddresses, useCreateAddress } from '@/lib/hooks/useAddresses'
import type { UserAddress } from '@/types'

const MAX_ADDRESSES = 10

const INPUT_CLS =
  'w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors'

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
        'w-full text-left rounded-xl border px-4 py-3.5 transition-all duration-150 active:scale-[0.99]',
        selected
          ? 'border-primary/40 bg-primary/[0.06] shadow-sm ring-1 ring-primary/20'
          : 'border-border bg-card hover:border-border-strong hover:bg-surface',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className={[
          'shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150',
          selected ? 'bg-primary/10' : 'bg-surface border border-border',
        ].join(' ')}>
          <MapPin size={14} strokeWidth={2} className={selected ? 'text-primary' : 'text-text-muted'} />
        </div>

        <div className="flex-1 min-w-0">
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

        <div className={[
          'shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-150',
          selected ? 'border-primary bg-primary' : 'border-border',
        ].join(' ')}>
          {selected && <Check size={10} strokeWidth={3.5} className="text-white" />}
        </div>
      </div>
    </button>
  )
}

function NewAddressForm({
  onResult,
  onCancel,
  showCancel,
  addresses,
  newResult,
  saveToBook,
  setSaveToBook,
  newLabel,
  setNewLabel,
  labelError,
  setLabelError,
}: {
  onResult: (r: PlaceResult | null) => void
  onCancel: () => void
  showCancel: boolean
  addresses: UserAddress[]
  newResult: PlaceResult | null
  saveToBook: boolean
  setSaveToBook: (v: boolean) => void
  newLabel: string
  setNewLabel: (v: string) => void
  labelError: string
  setLabelError: (v: string) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      {showCancel && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">New address</p>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1 text-xs text-text-subtle hover:text-text transition-colors"
          >
            <X size={12} strokeWidth={2} />
            Cancel
          </button>
        </div>
      )}

      <PlacesAddressInput
        placeholder="Search for an address"
        onSelect={(r) => onResult(r)}
        onClear={() => onResult(null)}
      />

      {newResult && addresses.length < MAX_ADDRESSES && (
        <label className="flex items-center gap-2.5 cursor-pointer pt-0.5">
          <input
            type="checkbox"
            checked={saveToBook}
            onChange={(e) => setSaveToBook(e.target.checked)}
            className="rounded border-border text-primary accent-primary"
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

  const footer = (
    <button
      type="button"
      onClick={handleConfirm}
      disabled={!canConfirm || saving}
      className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 inline-flex items-center justify-center gap-2 hover:shadow-md active:scale-[0.98]"
    >
      {saving && <Loader2 size={13} strokeWidth={2.5} className="animate-spin" />}
      {saving ? 'Saving…' : 'Confirm address'}
    </button>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Choose from saved addresses or enter a new one"
      icon={<MapPin size={15} strokeWidth={2} className="text-primary" />}
      footer={footer}
    >
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-text-subtle" />
          </div>
        ) : (
          <>
            {showNew ? (
              <NewAddressForm
                onResult={(r) => { setNewResult(r); setSelectedId(null) }}
                onCancel={() => { setShowNew(false); setNewResult(null) }}
                showCancel={addresses.length > 0}
                addresses={addresses}
                newResult={newResult}
                saveToBook={saveToBook}
                setSaveToBook={setSaveToBook}
                newLabel={newLabel}
                setNewLabel={setNewLabel}
                labelError={labelError}
                setLabelError={setLabelError}
              />
            ) : (
              <button
                type="button"
                onClick={() => { setShowNew(true); setSelectedId(null) }}
                className="w-full flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3.5 text-sm text-text-muted hover:border-primary/40 hover:text-primary hover:bg-primary/[0.04] transition-all duration-150"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card border border-border">
                  <Plus size={14} strokeWidth={2.5} />
                </span>
                <span className="font-medium">Use a different address</span>
              </button>
            )}

            {addresses.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wider pt-1">
                  Saved addresses
                </p>
                {addresses.map((addr) => (
                  <AddressCard
                    key={addr.id}
                    addr={addr}
                    selected={selectedId === addr.id}
                    onSelect={() => { setSelectedId(addr.id); setNewResult(null); setShowNew(false) }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
