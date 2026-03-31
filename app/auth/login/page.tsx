// app/auth/login/page.tsx
'use client'

import { useSignIn } from '@/lib/hooks/useAuth'
import { LoginForm, LoginFormData } from '@/components/auth'

export default function Login() {
  const { mutate: signIn, isPending, error } = useSignIn()

  function handleSubmit(data: LoginFormData) {
    signIn({ email: data.email, password: data.password })
  }

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
          <LoginForm
            onSubmit={handleSubmit}
            isPending={isPending}
            error={error?.message ?? null}
          />
        </div>
      </div>
    </div>
  )
}
