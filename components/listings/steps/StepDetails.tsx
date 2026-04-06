'use client'

import { useForm } from 'react-hook-form'
import { Input, Button } from '@/components/ui'
import type { Condition } from '@/types'

interface StepDetailsData {
  title: string
  description: string
  category: string
  condition: Condition
}

interface StepDetailsProps {
  defaultValues?: Partial<StepDetailsData>
  onNext: (data: StepDetailsData) => void
  onBack: () => void
}

const CATEGORIES = [
  'Electronics',
  'Furniture & Home',
  'Clothing & Accessories',
  'Appliances',
  'Books & Stationery',
  'Kids & Baby',
  'Sports & Outdoors',
  'Vehicles & Parts',
  'Other',
]

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
]

const selectClass = (hasError: boolean) =>
  [
    'block w-full px-4 py-3 text-text bg-card border rounded-md shadow-sm',
    'focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 transition duration-200',
    hasError ? 'border-error' : 'border-border',
  ].join(' ')

export function StepDetails({ defaultValues, onNext, onBack }: StepDetailsProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StepDetailsData>({ defaultValues })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <h2 className="text-xl font-bold text-text">Item details</h2>

      <Input
        label="Title"
        placeholder="e.g. Blue Nike Air Max size 43"
        error={errors.title?.message}
        {...register('title', {
          required: 'Title is required',
          maxLength: { value: 100, message: 'Title must be 100 characters or fewer' },
        })}
      />

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text">
          Description <span className="text-text-muted">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Describe the item — any defects, history, or reasons for selling"
          className="block w-full px-4 py-3 text-text placeholder-text-muted bg-card border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 transition duration-200"
          {...register('description', {
            maxLength: { value: 1000, message: 'Description must be 1000 characters or fewer' },
          })}
        />
        {errors.description && (
          <p className="text-sm text-error">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text">Category</label>
        <select
          className={selectClass(!!errors.category)}
          {...register('category', { required: 'Category is required' })}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {errors.category && <p className="text-sm text-error">{errors.category.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text">Condition</label>
        <select
          className={selectClass(!!errors.condition)}
          {...register('condition', { required: 'Condition is required' })}
        >
          <option value="">Select condition</option>
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {errors.condition && <p className="text-sm text-error">{errors.condition.message}</p>}
      </div>

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
