// app/verify-email/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useVerifyEmail, useSendVerification, useMe } from '@/lib/hooks/useAuth'
import VerifyEmailForm from '@/components/auth/VerifyEmailForm'

export default function VerifyEmailPage() {
  const { data: me } = useMe()
  const { mutate: verify, isPending, error } = useVerifyEmail()
  const { mutate: resend, isPending: isResending, data: resendData } = useSendVerification()
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (me?.otp_resend_after) {
      const diff = Math.ceil((new Date(me.otp_resend_after).getTime() - Date.now()) / 1000)
      if (diff > 0) setResendCooldown(diff)
    }
  }, [me])

  useEffect(() => {
    if (resendData?.retryAfter) setResendCooldown(resendData.retryAfter)
  }, [resendData])

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="declut" className="h-10" />
        </div>
        {/* Card */}
        <div className="bg-card rounded-xl shadow-card px-8 py-10">
          <VerifyEmailForm
            onSubmit={(code) => verify(code)}
            onResend={() => resend()}
            isPending={isPending}
            isResending={isResending}
            error={error?.message ?? null}
            resendCooldownSeconds={resendCooldown}
          />
        </div>
      </div>
    </div>
  )
}
