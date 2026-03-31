// app/auth/signup/page.tsx
'use client'

import { useSignUp } from '@/lib/hooks/useAuth'
import { SignupForm, SignupFormData } from '@/components/auth'

export default function Signup() {
  const { mutate: signUp, isPending, error } = useSignUp()

  function handleSubmit(data: SignupFormData) {
    signUp({
      email: data.email,
      password: data.password,
      name: data.name,
      account_type: data.accountType,
    })
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
          <SignupForm
            onSubmit={handleSubmit}
            isPending={isPending}
            error={error?.message ?? null}
          />
        </div>
      </div>
    </div>
  )
}
