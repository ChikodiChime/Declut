import { LAGOS_DELIVERY_FEE, OUTSIDE_LAGOS_DELIVERY_FEE } from '@/lib/constants'

type Props = {
  value: 'delivery' | 'pickup'
  onChange: (value: 'delivery' | 'pickup') => void
}

export default function DeliveryTypeSelector({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">Delivery option</p>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="delivery_type"
            value="delivery"
            checked={value === 'delivery'}
            onChange={() => onChange('delivery')}
            className="accent-black"
          />
          <span className="text-sm">
            Delivery{' '}
            <span className="text-gray-500">
              (₦{LAGOS_DELIVERY_FEE.toLocaleString()} Lagos / ₦{OUTSIDE_LAGOS_DELIVERY_FEE.toLocaleString()} outside Lagos)
            </span>
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="delivery_type"
            value="pickup"
            checked={value === 'pickup'}
            onChange={() => onChange('pickup')}
            className="accent-black"
          />
          <span className="text-sm">Pickup <span className="text-gray-500">(free — coordinate with seller)</span></span>
        </label>
      </div>
    </div>
  )
}
