import { supabaseAdmin } from '@/lib/supabase'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { verifyWebhookSignature } from '@/lib/paystack'
import { createNotification } from '@/lib/notifications'

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-paystack-signature') ?? ''

  if (!verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(rawBody) as { event: string; data: Record<string, unknown> }

  if (event.event === 'charge.success') {
    await handleChargeSuccess(event.data)
  }

  if (event.event === 'transfer.success') {
    await handleTransferSuccess(event.data)
  }

  if (event.event === 'transfer.failed') {
    await handleTransferFailed(event.data)
  }

  return Response.json({ received: true })
}

async function handleChargeSuccess(data: Record<string, unknown>) {
  const reference = data.reference as string
  const metadata = (data.metadata ?? {}) as { order_ids?: string; buyer_id?: string; buyer_email?: string }
  const amount = data.amount as number

  const orderIdsRaw = metadata.order_ids
  if (!orderIdsRaw) return

  const orderIds = orderIdsRaw.split(',').filter(Boolean)

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, item_price, delivery_fee, total_price, platform_fee, delivery_type, status')
    .in('id', orderIds)

  if (!orders || orders.length === 0) return

  const { data: orderItems } = await supabaseAdmin
    .from('order_items')
    .select('order_id, listing_id, item_price, listing:listings(id, title, price, listing_type, status, seller_id, area, images, condition, category)')
    .in('order_id', orderIds)

  const listingIds = (orderItems ?? []).map((i) => i.listing_id)
  const autoCancelAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

  await Promise.all([
    supabaseAdmin
      .from('orders')
      .update({ status: 'paid', paystack_reference: reference, auto_cancel_at: autoCancelAt })
      .in('id', orderIds)
      .eq('status', 'pending'),
    listingIds.length > 0
      ? supabaseAdmin.from('listings').update({ status: 'sold' }).in('id', listingIds)
      : Promise.resolve(),
    listingIds.length > 0
      ? supabaseAdmin.from('cart_items').delete().in('listing_id', listingIds)
      : Promise.resolve(),
  ])

  const buyerIdForNotif = metadata.buyer_id
  if (buyerIdForNotif && buyerIdForNotif !== 'anonymous') {
    await createNotification({
      user_id: buyerIdForNotif,
      type: 'order_update',
      title: 'Payment confirmed',
      body: `Your payment was received. ${orders.length > 1 ? `${orders.length} orders are` : 'Your order is'} now being prepared.`,
      link: `/dashboard/orders`,
    })
  }

  for (const order of orders) {
    await createNotification({
      user_id: order.seller_id,
      type: 'order_update',
      title: 'New order received',
      body: `You have a new paid order. Accept within 12 hours to avoid auto-cancellation.`,
      link: `/dashboard/orders`,
    })
  }

  const buyerEmail = metadata.buyer_email
  const buyerId = metadata.buyer_id

  if (buyerEmail) {
    let buyerName = 'Customer'
    if (buyerId && buyerId !== 'anonymous') {
      const { data: buyer } = await supabaseAdmin
        .from('users')
        .select('name')
        .eq('id', buyerId)
        .single()
      if (buyer?.name) buyerName = buyer.name
    }

    const deliveryType = (orders[0].delivery_type ?? 'delivery') as 'delivery' | 'pickup'
    const grandTotal = Math.round(amount / 100)
    const groups = orders.map((o) => {
      const items = (orderItems ?? [])
        .filter((i) => i.order_id === o.id)
        .map((i) => ({ id: i.listing_id, listing_id: i.listing_id, listing: i.listing as never }))
      return {
        seller_id: o.seller_id,
        items,
        subtotal: o.item_price ?? 0,
        delivery_fee: o.delivery_fee ?? 0,
        total: o.total_price ?? 0,
      }
    })

    sendOrderConfirmationEmail({ to: buyerEmail, buyerName, orderIds, groups, grandTotal, deliveryType })
      .catch((e) => console.error('Confirmation email failed:', e))

    if (buyerId && buyerId !== 'anonymous') {
      await supabaseAdmin.from('cart_items').delete().eq('user_id', buyerId)
    }
  }
}

async function handleTransferSuccess(data: Record<string, unknown>) {
  const transferCode = data.transfer_code as string
  const reason = data.reason as string | undefined

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id')
    .eq('paystack_transfer_id', transferCode)
    .single()

  if (!order) return

  const orderId = reason?.match(/#([a-f0-9-]{8})/)?.[1] ?? order.id.slice(0, 8)

  await createNotification({
    user_id: order.seller_id,
    type: 'payout_update',
    title: 'Payout sent',
    body: `Your payout for order #${orderId} has been transferred to your bank account.`,
    link: `/dashboard/billing`,
  })
}

async function handleTransferFailed(data: Record<string, unknown>) {
  const transferCode = data.transfer_code as string
  console.error(`Paystack transfer failed: ${transferCode}`, data)

  await supabaseAdmin
    .from('orders')
    .update({ paystack_transfer_id: null })
    .eq('paystack_transfer_id', transferCode)
}
