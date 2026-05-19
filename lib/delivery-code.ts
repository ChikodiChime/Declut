// lib/delivery-code.ts
import { createHmac } from 'crypto'

export function computeDeliveryCode(orderId: string): string {
  const secret = process.env.DELIVERY_CODE_SECRET
  if (!secret) throw new Error('DELIVERY_CODE_SECRET env var is required')
  const hmac = createHmac('sha256', secret).update(orderId).digest('hex')
  const code = parseInt(hmac.slice(0, 4), 16) % 10000
  return code.toString().padStart(4, '0')
}
