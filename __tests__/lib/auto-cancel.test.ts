import { describe, it, expect, beforeEach, vi } from 'vitest'

const { supabaseAdminMock, setResponses, getCalls, refundTransactionMock, createNotificationMock } = vi.hoisted(() => {
  let responses: Array<{ data: unknown; error: unknown }> = []
  let calls: Array<{ table: string; ops: Array<[string, unknown[]]> }> = []
  let cursor = 0

  function builder(table: string) {
    const ops: Array<[string, unknown[]]> = []
    calls.push({ table, ops })
    const chain: Record<string, (...args: unknown[]) => unknown> & {
      single?: () => Promise<unknown>
      then?: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise<unknown>
    } = {}
    for (const method of ['select', 'update', 'eq', 'lt', 'is', 'in']) {
      chain[method] = (...args: unknown[]) => {
        ops.push([method, args])
        return chain
      }
    }
    chain.single = () => Promise.resolve(responses[cursor++])
    chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(responses[cursor++]).then(resolve, reject)
    return chain
  }

  return {
    supabaseAdminMock: { from: (table: string) => builder(table) },
    setResponses: (r: Array<{ data: unknown; error: unknown }>) => {
      responses = r
      cursor = 0
      calls = []
    },
    getCalls: () => calls,
    refundTransactionMock: vi.fn(),
    createNotificationMock: vi.fn(),
  }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: supabaseAdminMock }))
vi.mock('@/lib/paystack', () => ({ refundTransaction: refundTransactionMock }))
vi.mock('@/lib/notifications', () => ({ createNotification: createNotificationMock }))

const { executeAutoCancel } = await import('@/lib/auto-cancel')


const baseOrder = {
  id: 'order-1',
  buyer_id: 'buyer-1',
  seller_id: 'seller-1',
  total_price: 5000,
  paystack_reference: 'ref-abc',
  listing_id: null,
}

beforeEach(() => {
  refundTransactionMock.mockReset().mockResolvedValue(undefined)
  createNotificationMock.mockReset().mockResolvedValue(undefined)
})

describe('executeAutoCancel', () => {
  it('does not refund when the order is not found', async () => {
    setResponses([{ data: null, error: null }])

    await executeAutoCancel('order-1')

    expect(refundTransactionMock).not.toHaveBeenCalled()
  })

  it('does not refund when the order can no longer be claimed', async () => {
    setResponses([
      { data: baseOrder, error: null },
      { data: null, error: null },
    ])

    await executeAutoCancel('order-1')

    expect(refundTransactionMock).not.toHaveBeenCalled()
  })

  it('refunds via Paystack using the order reference and total price', async () => {
    setResponses([
      { data: baseOrder, error: null },
      { data: { id: baseOrder.id }, error: null },
      { data: null, error: null },
      { data: [], error: null },
    ])

    await executeAutoCancel('order-1')

    expect(refundTransactionMock).toHaveBeenCalledWith({ transaction: 'ref-abc', amount: 500000 })
  })

  it('restores the listing to available after a successful refund', async () => {
    setResponses([
      { data: baseOrder, error: null },
      { data: { id: baseOrder.id }, error: null },
      { data: null, error: null },
      { data: [{ listing_id: 'listing-9' }], error: null },
      { data: null, error: null },
    ])

    await executeAutoCancel('order-1')

    const listingsUpdate = getCalls()
      .filter((c) => c.table === 'listings')
      .flatMap((c) => c.ops)
      .find(([method]) => method === 'update')

    expect(listingsUpdate?.[1][0]).toEqual({ status: 'available' })
  })

  it('notifies the buyer after a successful cancellation', async () => {
    setResponses([
      { data: baseOrder, error: null },
      { data: { id: baseOrder.id }, error: null },
      { data: null, error: null },
      { data: [], error: null },
    ])

    await executeAutoCancel('order-1')

    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'buyer-1', title: 'Order auto-cancelled and refunded' })
    )
  })

  it('does not notify anyone when the refund fails', async () => {
    refundTransactionMock.mockRejectedValue(new Error('paystack down'))
    setResponses([
      { data: baseOrder, error: null },
      { data: { id: baseOrder.id }, error: null },
      { data: null, error: null },
    ])

    await executeAutoCancel('order-1')

    expect(createNotificationMock).not.toHaveBeenCalled()
  })
})
