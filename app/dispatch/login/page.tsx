'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, ArrowRight } from 'lucide-react'

export default function DispatcherLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Login failed')
      if (json.data?.user?.account_type !== 'dispatcher') {
        throw new Error('This login is for dispatchers only. Use the main login page instead.')
      }
      router.push('/dispatch')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="declut" className="h-9" />
        </div>

        <div className="bg-card rounded-2xl shadow-card px-8 py-10">
          <h1 className="text-xl font-bold mb-1" style={{ color: '#16130f' }}>Dispatcher login</h1>
          <p className="text-sm mb-6" style={{ color: '#78726c' }}>Sign in to your dispatch account.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { key: 'email', label: 'Email address', icon: Mail, type: 'email', placeholder: 'you@example.com' },
              { key: 'password', label: 'Password', icon: Lock, type: 'password', placeholder: '••••••••' },
            ].map(({ key, label, icon: Icon, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#78726c' }}>{label}</label>
                <div className="relative">
                  <Icon size={15} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a8a09a' }} />
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    required
                    className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2"
                    style={{ borderColor: '#e8e4dc', background: '#faf9f7', color: '#16130f' }}
                  />
                </div>
              </div>
            ))}

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: '#4f46e5' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRight size={14} strokeWidth={2} />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs" style={{ color: '#a8a09a' }}>
            New dispatcher?{' '}
            <Link href="/dispatch/register" className="underline" style={{ color: '#4f46e5' }}>Create account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
