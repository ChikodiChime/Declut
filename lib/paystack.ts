// lib/paystack.ts
import { createHmac } from 'crypto'

const BASE = 'https://api.paystack.co'

async function request<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.status) throw new Error(json.message ?? 'Paystack API error')
  return json.data as T
}

export type PaystackTransaction = {
  status: string
  reference: string
  amount: number
  metadata: {
    order_ids: string
    buyer_id: string
    buyer_email: string
  }
}

export type PaystackRecipient = {
  recipient_code: string
}

export type PaystackTransfer = {
  transfer_code: string
}

export type PaystackBank = {
  name: string
  code: string
}

export type PaystackResolvedAccount = {
  account_name: string
  account_number: string
}

export function initializeTransaction(params: {
  email: string
  amount: number
  reference: string
  metadata: object
  callback_url: string
}): Promise<{ authorization_url: string; reference: string }> {
  return request('POST', '/transaction/initialize', params)
}

export function verifyTransaction(reference: string): Promise<PaystackTransaction> {
  return request('GET', `/transaction/verify/${encodeURIComponent(reference)}`)
}

export function createTransferRecipient(params: {
  type: 'nuban'
  name: string
  account_number: string
  bank_code: string
  currency: 'NGN'
}): Promise<PaystackRecipient> {
  return request('POST', '/transferrecipient', params)
}

export function initiateTransfer(params: {
  source: 'balance'
  amount: number
  recipient: string
  reason: string
}): Promise<PaystackTransfer> {
  return request('POST', '/transfer', params)
}

export function refundTransaction(params: {
  transaction: string
  amount: number
}): Promise<void> {
  return request('POST', '/refund', params)
}

export function listBanks(): Promise<PaystackBank[]> {
  return request('GET', '/bank?country=nigeria&per_page=100&use_cursor=false')
}

export function resolveAccount(
  accountNumber: string,
  bankCode: string
): Promise<PaystackResolvedAccount> {
  return request('GET', `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`)
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const hash = createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')
  return hash === signature
}
