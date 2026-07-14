"use client";

import { useSignUp } from "@/lib/hooks/useAuth";
import SignupForm, { SignupFormData } from "@/components/auth/SignupForm";
import { AuthPanel } from "@/components/auth/AuthPanel";

export default function SignupPage() {
  const { mutate: signUp, isPending, error } = useSignUp();

  function handleSubmit(data: SignupFormData) {
    signUp({
      email: data.email,
      password: data.password,
      name: data.name,
      account_type: data.accountType,
    });
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
            <SignupForm
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
