import type { SellerGroup } from '@/app/api/orders/utils'

type Props = {
  groups: SellerGroup[]
  grandTotal: number
}

export default function OrderSummary({ groups, grandTotal }: Props) {
  return (
    <div className="rounded-xl border p-4 text-sm">
      <h2 className="font-semibold mb-4">Order summary</h2>
      {groups.map((group) => (
        <div key={group.seller_id} className="mb-4">
          {group.items.map((item) => (
            <div key={item.id} className="flex justify-between py-1">
              <span className="text-gray-700 truncate max-w-[200px]">{item.listing.title}</span>
              <span>₦{item.listing.price.toLocaleString()}</span>
            </div>
          ))}
          {group.delivery_fee > 0 && (
            <div className="flex justify-between py-1 text-gray-500">
              <span>Delivery</span>
              <span>₦{group.delivery_fee.toLocaleString()}</span>
            </div>
          )}
          <div className="border-t mt-1 pt-1 flex justify-between font-medium">
            <span>Subtotal</span>
            <span>₦{group.total.toLocaleString()}</span>
          </div>
        </div>
      ))}
      <div className="border-t pt-3 flex justify-between font-bold text-base">
        <span>Total</span>
        <span>₦{grandTotal.toLocaleString()}</span>
      </div>
    </div>
  )
}
