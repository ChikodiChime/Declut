'use client'

import { useReducer } from 'react'
import { StepType } from './steps/StepType'
import { StepDetails } from './steps/StepDetails'
import { StepPricing } from './steps/StepPricing'
import { StepPhotos } from './steps/StepPhotos'
import type { ListingFormData, ListingType } from '@/types'

export interface ListingFormProps {
  initialValues?: Partial<ListingFormData>
  onSubmit: (data: ListingFormData) => Promise<void>
  isPending: boolean
}

interface FormState {
  step: 1 | 2 | 3 | 4
  data: Partial<ListingFormData>
}

type FormAction =
  | { type: 'NEXT'; payload: Partial<ListingFormData> }
  | { type: 'BACK' }

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'NEXT':
      return {
        step: (Math.min(state.step + 1, 4)) as FormState['step'],
        data: { ...state.data, ...action.payload },
      }
    case 'BACK':
      return { ...state, step: (Math.max(state.step - 1, 1)) as FormState['step'] }
  }
}

const STEP_LABELS = ['Type', 'Details', 'Pricing', 'Photos']

export function ListingForm({ initialValues, onSubmit, isPending }: ListingFormProps) {
  const [state, dispatch] = useReducer(formReducer, {
    step: 1,
    data: initialValues ?? {},
  })

  async function handleFinalSubmit(images: string[]) {
    const finalData = { ...state.data, images } as ListingFormData
    await onSubmit(finalData)
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as FormState['step']
          const isActive = stepNum === state.step
          const isDone = stepNum < state.step
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div
                  className={[
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    isActive
                      ? 'bg-primary text-white'
                      : isDone
                      ? 'bg-primary/20 text-primary'
                      : 'bg-border text-text-muted',
                  ].join(' ')}
                >
                  {isDone ? '✓' : stepNum}
                </div>
                <span
                  className={`text-xs hidden sm:block ${
                    isActive ? 'text-text font-medium' : 'text-text-muted'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className="flex-1 h-px bg-border mx-2" />
              )}
            </div>
          )
        })}
      </div>

      {state.step === 1 && (
        <StepType
          defaultValues={{ listing_type: state.data.listing_type }}
          onNext={(data) => dispatch({ type: 'NEXT', payload: data })}
        />
      )}
      {state.step === 2 && (
        <StepDetails
          defaultValues={{
            title: state.data.title,
            description: state.data.description,
            category: state.data.category,
            condition: state.data.condition,
          }}
          onNext={(data) => dispatch({ type: 'NEXT', payload: data })}
          onBack={() => dispatch({ type: 'BACK' })}
        />
      )}
      {state.step === 3 && (
        <StepPricing
          listingType={state.data.listing_type as ListingType}
          defaultValues={{ price: state.data.price, area: state.data.area }}
          onNext={(data) => dispatch({ type: 'NEXT', payload: data })}
          onBack={() => dispatch({ type: 'BACK' })}
        />
      )}
      {state.step === 4 && (
        <StepPhotos
          defaultImages={state.data.images}
          onNext={handleFinalSubmit}
          onBack={() => dispatch({ type: 'BACK' })}
          isPending={isPending}
        />
      )}
    </div>
  )
}
