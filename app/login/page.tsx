// app/login/page.tsx
'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, ArrowRight, KeyRound } from 'lucide-react'
import { useSendOtp, useVerifyOtp } from '@/lib/hooks/useBuyerAuth'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function BuyerLoginContent() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next')

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')

  const sendOtp = useSendOtp()
  const verifyOtp = useVerifyOtp(next)

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_REGEX.test(email)) return
    sendOtp.mutate(email, {
      onSuccess: () => setStep('code'),
    })
  }

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return
    verifyOtp.mutate({ email, code })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="declut" className="h-9" />
        </div>

        <div className="bg-card rounded-2xl shadow-card px-8 py-10">
          {step === 'email' ? (
            <>
              <h1 className="text-xl font-bold mb-1" style={{ color: '#16130f' }}>
                Track your orders
              </h1>
              <p className="text-sm mb-6" style={{ color: '#78726c' }}>
                Enter your email and we&apos;ll send you a login code.
              </p>

              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#78726c' }}>
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      size={15}
                      strokeWidth={1.8}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: '#a8a09a' }}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2"
                      style={{
                        borderColor: '#e8e4dc',
                        background: '#faf9f7',
                        color: '#16130f',
                      }}
                    />
                  </div>
                </div>

                {sendOtp.error && (
                  <p className="text-xs text-red-600">{sendOtp.error.message}</p>
                )}

                <button
                  type="submit"
                  disabled={sendOtp.isPending}
                  className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: '#4f46e5' }}
                >
                  {sendOtp.isPending ? 'Sending…' : 'Send code'}
                  {!sendOtp.isPending && <ArrowRight size={14} strokeWidth={2} />}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-1" style={{ color: '#16130f' }}>
                Check your email
              </h1>
              <p className="text-sm mb-6" style={{ color: '#78726c' }}>
                We sent a 6-digit code to <strong>{email}</strong>.
              </p>

              <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#78726c' }}>
                    Verification code
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={15}
                      strokeWidth={1.8}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: '#a8a09a' }}
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm font-mono outline-none focus:ring-2 tracking-widest"
                      style={{
                        borderColor: '#e8e4dc',
                        background: '#faf9f7',
                        color: '#16130f',
                      }}
                    />
                  </div>
                </div>

                {verifyOtp.error && (
                  <p className="text-xs text-red-600">{verifyOtp.error.message}</p>
                )}

                <button
                  type="submit"
                  disabled={verifyOtp.isPending || code.length !== 6}
                  className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: '#4f46e5' }}
                >
                  {verifyOtp.isPending ? 'Verifying…' : 'Log in'}
                  {!verifyOtp.isPending && <ArrowRight size={14} strokeWidth={2} />}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('email'); setCode('') }}
                  className="text-xs text-center transition-colors"
                  style={{ color: '#78726c' }}
                >
                  Use a different email
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-xs" style={{ color: '#a8a09a' }}>
            Selling on Declutter?{' '}
            <Link href="/auth/login" className="underline" style={{ color: '#4f46e5' }}>
              Seller login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function BuyerLoginPage() {
  return (
    <Suspense>
      <BuyerLoginContent />
    </Suspense>
  )
}
