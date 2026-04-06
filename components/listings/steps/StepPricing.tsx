'use client'

import { useForm } from 'react-hook-form'
import { Input, Button } from '@/components/ui'
import type { ListingType } from '@/types'

interface StepPricingData {
  price: number | null
  area: string
}

interface StepPricingProps {
  listingType: ListingType
  defaultValues?: Partial<StepPricingData>
  onNext: (data: StepPricingData) => void
  onBack: () => void
}

export function StepPricing({ listingType, defaultValues, onNext, onBack }: StepPricingProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StepPricingData>({ defaultValues })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <h2 className="text-xl font-bold text-text">Pricing & location</h2>

      {listingType === 'for_sale' && (
        <Input
          label="Price (₦)"
          type="number"
          min="1"
          placeholder="e.g. 15000"
          error={errors.price?.message}
          {...register('price', {
            required: 'Price is required for For Sale listings',
            valueAsNumber: true,
            min: { value: 1, message: 'Price must be greater than 0' },
          })}
        />
      )}

      <Input
        label="Area"
        placeholder="e.g. Ajah, Lagos"
        error={errors.area?.message}
        {...register('area', { required: 'Area is required' })}
      />

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" className="flex-1">
          Next
        </Button>
      </div>
    </form>
  )
}
