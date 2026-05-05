"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock } from "lucide-react";
import { Input, Button } from "@/components/ui";

export interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => void;
  isPending?: boolean;
  error?: string | null;
}

export default function LoginForm({ onSubmit, isPending, error }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginFormData>({ email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Welcome back</h1>
        <p className="mt-1 text-sm text-text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="font-medium text-primary hover:text-primary-hover transition-colors">
            Create one
          </Link>
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          name="email"
          type="email"
          label="Email address"
          autoComplete="email"
          required
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
          leadingIcon={<Mail size={16} className="text-text-muted" />}
        />

        <Input
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          required
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your password"
          leadingIcon={<Lock size={16} className="text-text-muted" />}
        />

        <div className="flex items-center justify-end">
          <button type="button" disabled className="text-sm font-medium text-text-muted cursor-not-allowed">
            Forgot password?
          </button>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-lg bg-error-bg px-4 py-3 text-sm text-error"
          >
            {error}
          </motion.p>
        )}

        <Button
          type="submit"
          size="md"
          loading={isPending}
          disabled={isPending}
          className="w-full mt-2"
        >
          Sign In
        </Button>
      </form>
    </motion.div>
  );
}
