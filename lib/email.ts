// lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Your Declutter verification code',
    html: buildOtpHtml(code),
    text: `Your Declutter verification code is: ${code}\n\nThis code expires in 30 minutes.\n\nIf you didn't create a Declutter account, you can safely ignore this email.`,
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

          <!-- Header -->
          <tr>
            <td style="background:#4F46E5;padding:32px 40px;text-align:center;">
              <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">decl<span style="color:#A5B4FC">ut</span></span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Verify your email address</h1>
              <p style="margin:0 0 32px;font-size:15px;color:#6B7280;line-height:1.6;">
                Enter the code below in the app to complete your registration. It expires in <strong>30 minutes</strong>.
              </p>

              <!-- OTP Code -->
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

          <!-- Footer -->
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
