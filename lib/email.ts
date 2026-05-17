import { Resend } from 'resend'
import type { SellerGroup } from '@/app/api/orders/utils'

const resend = new Resend(process.env.RESEND_API_KEY!)

// ── OTP email ────────────────────────────────────────────────────────────────

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Your Declutter verification code',
    html: buildOtpHtml(code),
    text: `Your Declutter verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't create a Declutter account, you can safely ignore this email.`,
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}

function buildOtpHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="background:#4F46E5;padding:32px 40px;text-align:center;">
              <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">decl<span style="color:#A5B4FC">ut</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Verify your email address</h1>
              <p style="margin:0 0 32px;font-size:15px;color:#6B7280;line-height:1.6;">
                Enter the code below in the app to complete your registration. It expires in <strong>15 minutes</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center" style="padding:0 0 32px;">
                    <div style="display:inline-block;background:#EEF2FF;border:2px solid #C7D2FE;border-radius:12px;padding:20px 32px;">
                      <span style="font-size:44px;font-weight:800;letter-spacing:16px;color:#4F46E5;font-variant-numeric:tabular-nums;">${code}</span>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;border-top:1px solid #F3F4F6;padding-top:24px;">
                If you didn't create a Declutter account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#F9FAFB;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;">&copy; 2026 declut. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Order confirmation email ──────────────────────────────────────────────────

export type OrderConfirmationParams = {
  to: string
  buyerName: string
  orderIds: string[]
  groups: SellerGroup[]
  grandTotal: number
  deliveryType: 'delivery' | 'pickup'
}

export async function sendOrderConfirmationEmail(params: OrderConfirmationParams): Promise<void> {
  const { to, buyerName, orderIds, groups, grandTotal, deliveryType } = params
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Your Declutter order is confirmed',
    html: buildOrderConfirmationHtml({ buyerName, orderIds, groups, grandTotal, deliveryType }),
    text: buildOrderConfirmationText({ buyerName, orderIds, groups, grandTotal, deliveryType }),
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}

type OrderEmailContent = Omit<OrderConfirmationParams, 'to'>

function buildItemRowsHtml(groups: SellerGroup[], deliveryType: 'delivery' | 'pickup'): string {
  return groups
    .map((group) => {
      const itemRows = group.items
        .map(
          (item) => `
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#374151;border-bottom:1px solid #F3F4F6;">${item.listing.title}</td>
          <td style="padding:10px 0;font-size:14px;color:#374151;text-align:right;white-space:nowrap;border-bottom:1px solid #F3F4F6;">&#8358;${item.listing.price.toLocaleString()}</td>
        </tr>`
        )
        .join('')

      const deliveryRow =
        deliveryType === 'delivery' && group.delivery_fee > 0
          ? `<tr>
          <td style="padding:6px 0;font-size:13px;color:#9CA3AF;">Delivery</td>
          <td style="padding:6px 0;font-size:13px;color:#9CA3AF;text-align:right;white-space:nowrap;">&#8358;${group.delivery_fee.toLocaleString()}</td>
        </tr>`
          : ''

      return `
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:8px;border-top:1px solid #E5E7EB;">
        ${itemRows}
        ${deliveryRow}
      </table>`
    })
    .join('')
}

function buildOrderConfirmationHtml(params: OrderEmailContent): string {
  const { buyerName, groups, grandTotal, deliveryType } = params
  const itemsHtml = buildItemRowsHtml(groups, deliveryType)
  const deliveryNote =
    deliveryType === 'delivery'
      ? 'The seller will be in touch within 12 hours to arrange delivery.'
      : 'The seller will be in touch within 12 hours to arrange pickup.'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="background:#4F46E5;padding:32px 40px;text-align:center;">
              <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">decl<span style="color:#A5B4FC">ut</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Order confirmed</h1>
              <p style="margin:0 0 6px;font-size:15px;color:#374151;">Hi ${buyerName},</p>
              <p style="margin:0 0 28px;font-size:15px;color:#6B7280;line-height:1.6;">
                Your order has been placed. Here&rsquo;s what you ordered:
              </p>
              ${itemsHtml}
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top:2px solid #111827;margin-top:4px;">
                <tr>
                  <td style="padding:14px 0 0;font-size:16px;font-weight:700;color:#111827;">Total</td>
                  <td style="padding:14px 0 0;font-size:16px;font-weight:700;color:#111827;text-align:right;white-space:nowrap;">&#8358;${grandTotal.toLocaleString()}</td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:14px;color:#6B7280;line-height:1.6;background:#F9FAFB;border-radius:10px;padding:16px 20px;">
                ${deliveryNote}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#F9FAFB;padding:20px 40px;text-align:center;border-top:1px solid #F3F4F6;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;">&copy; 2026 declut. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildOrderConfirmationText(params: OrderEmailContent): string {
  const { buyerName, orderIds, groups, grandTotal, deliveryType } = params
  const lines: string[] = [
    `Hi ${buyerName},`,
    '',
    'Your Declutter order has been confirmed.',
    `Order ID: ${orderIds.join(', ')}`,
    '',
    'What you ordered:',
    '-----------------',
  ]

  for (const group of groups) {
    for (const item of group.items) {
      lines.push(`${item.listing.title} — ₦${item.listing.price.toLocaleString()}`)
    }
    if (deliveryType === 'delivery' && group.delivery_fee > 0) {
      lines.push(`Delivery — ₦${group.delivery_fee.toLocaleString()}`)
    }
  }

  lines.push('-----------------')
  lines.push(`Total — ₦${grandTotal.toLocaleString()}`)
  lines.push('')
  lines.push(
    deliveryType === 'delivery'
      ? 'The seller will be in touch within 12 hours to arrange delivery.'
      : 'The seller will be in touch within 12 hours to arrange pickup.'
  )
  lines.push('')
  lines.push('— The declut team')

  return lines.join('\n')
}
