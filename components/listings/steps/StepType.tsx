'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui'
import type { ListingType } from '@/types'

interface StepTypeData {
  listing_type: ListingType
}

interface StepTypeProps {
  defaultValues?: Partial<StepTypeData>
  onNext: (data: StepTypeData) => void
}

const OPTIONS: { value: ListingType; label: string; description: string }[] = [
  { value: 'for_sale', label: 'For Sale', description: 'Set a price, buyer pays via Stripe' },
  { value: 'free', label: 'Free', description: 'Give it away at no cost' },
  { value: 'donate', label: 'Donate', description: 'Donate to a charity' },
]

export function StepType({ defaultValues, onNext }: StepTypeProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StepTypeData>({ defaultValues })

  const selected = watch('listing_type')

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text mb-1">What kind of listing is this?</h2>
        <p className="text-sm text-text-muted">You can't change this after publishing.</p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={[
              'flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors',
              selected === opt.value
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/40',
            ].join(' ')}
          >
            <input
              type="radio"
              value={opt.value}
              className="mt-1 accent-primary"
              {...register('listing_type', { required: 'Please select a listing type' })}
            />
            <div>
              <p className="font-semibold text-text">{opt.label}</p>
              <p className="text-sm text-text-muted">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>

      {errors.listing_type && (
        <p className="text-sm text-error">{errors.listing_type.message}</p>
      )}

      <Button type="submit" className="w-full">
        Next
      </Button>
    </form>
  )
}
