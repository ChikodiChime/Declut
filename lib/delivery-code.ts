// lib/delivery-code.ts
import { createHmac } from 'crypto'

export function computeDeliveryCode(orderId: string): string {
  const hmac = createHmac('sha256', process.env.DELIVERY_CODE_SECRET!)
    .update(orderId)
    .digest('hex')
  const code = parseInt(hmac.slice(0, 4), 16) % 10000
  return code.toString().padStart(4, '0')
}
