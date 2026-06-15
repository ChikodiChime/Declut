'use client'

import { CustomDropdown } from '@/components/ui/CustomDropdown'

interface Option {
  readonly value: string
  readonly label: string
}

interface FilterSelectProps {
  value: string
  onChange: (v: string) => void
  options: readonly Option[]
  width?: number
}

export function FilterSelect({ value, onChange, options, width = 148 }: FilterSelectProps) {
  return (
    <div style={{ width }}>
      <CustomDropdown
        size="sm"
        value={value}
        onChange={onChange}
        options={options as { value: string; label: string }[]}
      />
    </div>
  )
}
