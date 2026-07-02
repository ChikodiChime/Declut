'use client'

import { useRef } from 'react'
import { ImagePlus } from 'lucide-react'

interface ImageAttachButtonProps {
  onSelect: (file: File) => void
  disabled?: boolean
}

export function ImageAttachButton({ onSelect, disabled }: ImageAttachButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onSelect(file)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-label="Attach a photo"
        className="p-2.5 rounded-xl bg-background border border-border text-text-muted hover:text-text hover:border-border-strong transition-all shrink-0 disabled:opacity-40"
      >
        <ImagePlus size={15} />
      </button>
    </>
  )
}
