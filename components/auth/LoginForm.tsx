// components/auth/LoginForm.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Input, Button } from "@/components/ui";

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => void;
  isPending?: boolean;
  error?: string | null;
}

export default function LoginForm({ onSubmit, isPending, error }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
    rememberMe: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-text">Sign in</h2>
        <p className="mt-1.5 text-sm text-text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="font-medium text-primary hover:text-primary-hover">
            Create one
          </Link>
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input
          id="email"
          name="email"
          type="email"
          label="Email address"
          autoComplete="email"
          required
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
        />

        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          required
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              id="remember-me"
              name="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-muted">Remember me</span>
          </label>
          <a href="#" className="text-sm font-medium text-primary hover:text-primary-hover">
            Forgot password?
          </a>
        </div>

        {error && (
          <p className="rounded-md bg-error-bg px-4 py-3 text-sm text-error">{error}</p>
        )}

        <Button
          type="submit"
          size="md"
          loading={isPending}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "Signing in…" : "Sign In"}
        </Button>
      </form>
    </div>
  );
}
