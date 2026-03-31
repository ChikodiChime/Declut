// components/auth/VerifyEmailForm.tsx
'use client'

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react'

interface Props {
  onSubmit: (code: string) => void
  onResend: () => void
  isPending: boolean
  isResending: boolean
  error: string | null
  resendCooldownSeconds: number
}

export default function VerifyEmailForm({
  onSubmit,
  onResend,
  isPending,
  isResending,
  error,
  resendCooldownSeconds,
}: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [secondsLeft, setSecondsLeft] = useState(resendCooldownSeconds)
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  // Sync cooldown from parent (e.g. after resend returns a new retryAfter)
  useEffect(() => {
    setSecondsLeft(resendCooldownSeconds)
  }, [resendCooldownSeconds])

  // Countdown tick — depends only on the seed, not the ticking value
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendCooldownSeconds])

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const newDigits = [...digits]
    newDigits[index] = value
    setDigits(newDigits)
    if (value && index < 5) {
      inputs.current[index + 1]?.focus()
    }
    const code = newDigits.join('')
    if (newDigits.every((d) => d !== '') && !isPending) {
      onSubmit(code)
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 0) return
    const newDigits = Array(6).fill('')
    pasted.split('').forEach((ch, i) => { newDigits[i] = ch })
    setDigits(newDigits)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6 && !isPending) onSubmit(pasted)
  }

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Check your email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We sent a 6-digit code to your email address. Enter it below.
        </p>
      </div>

      <div className="space-y-6">
        {/* OTP inputs */}
        <div className="flex justify-center gap-3" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(i, e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(i, e)}
              disabled={isPending}
              className="h-14 w-11 rounded-lg border border-gray-300 text-center text-xl font-semibold text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-center text-sm text-red-600">{error}</p>
        )}

        {/* Loading */}
        {isPending && (
          <p className="text-center text-sm text-gray-500">Verifying…</p>
        )}

        {/* Resend */}
        <div className="text-center">
          {secondsLeft > 0 ? (
            <p className="text-sm text-gray-500">
              Resend code in{' '}
              <span className="font-medium text-gray-700">{formatCountdown(secondsLeft)}</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={onResend}
              disabled={isResending}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
            >
              {isResending ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
