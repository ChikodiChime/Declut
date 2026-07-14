"use client";

import { useSignIn } from "@/lib/hooks/useAuth";
import LoginForm, { LoginFormData } from "@/components/auth/LoginForm";
import { AuthPanel } from "@/components/auth/AuthPanel";

export default function LoginPage() {
  const { mutate: signIn, isPending, error } = useSignIn();

  function handleSubmit(data: LoginFormData) {
    signIn({ email: data.email, password: data.password });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthPanel />

      {/* Form side */}
      <div className="flex items-center justify-center px-6 py-12 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Unstash" className="h-9" />
          </div>

          <div className="bg-card rounded-2xl shadow-card px-8 py-10">
            <LoginForm
              onSubmit={handleSubmit}
              isPending={isPending}
              error={error?.message ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
