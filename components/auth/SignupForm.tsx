"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, User, Building2 } from "lucide-react";
import { Input, Button } from "@/components/ui";

export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  accountType: "individual" | "business";
}

interface SignupFormProps {
  onSubmit?: (data: SignupFormData) => void;
  isPending?: boolean;
  error?: string | null;
}

export default function SignupForm({ onSubmit, isPending, error }: SignupFormProps) {
  const [formData, setFormData] = useState<SignupFormData>({
    name: "",
    email: "",
    password: "",
    accountType: "individual",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setPasswordError("");
    onSubmit?.(formData);
  };

  const isBusiness = formData.accountType === "business";

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Create your account</h1>
        <p className="mt-1 text-sm text-text-muted">
          Already have one?{" "}
          <Link href="/auth/login" className="font-medium text-primary hover:text-primary-hover transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      {/* Account type toggle */}
      <div className="flex rounded-lg border border-border bg-surface p-1 gap-1">
        {(["individual", "business"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFormData((prev) => ({ ...prev, accountType: type }))}
            className={[
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all duration-200",
              formData.accountType === type
                ? "bg-card text-text shadow-sm"
                : "text-text-muted hover:text-text",
            ].join(" ")}
          >
            {type === "individual" ? <User size={15} strokeWidth={2} /> : <Building2 size={15} strokeWidth={2} />}
            {type === "individual" ? "Individual" : "Business"}
          </button>
        ))}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          name="name"
          type="text"
          label={isBusiness ? "Business name" : "Full name"}
          required
          value={formData.name}
          onChange={handleChange}
          placeholder={isBusiness ? "Acme Ltd." : "John Doe"}
          leadingIcon={isBusiness ? <Building2 size={16} className="text-text-muted" /> : <User size={16} className="text-text-muted" />}
        />

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
          autoComplete="new-password"
          required
          value={formData.password}
          onChange={handleChange}
          placeholder="Create a strong password"
          leadingIcon={<Lock size={16} className="text-text-muted" />}
        />

        <Input
          name="confirmPassword"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat your password"
          leadingIcon={<Lock size={16} className="text-text-muted" />}
          error={passwordError || undefined}
        />

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
          Create Account
        </Button>

        <p className="text-xs text-center text-text-muted">
          By creating an account you agree to our{" "}
          <a href="#" className="text-primary hover:underline">Terms</a> and{" "}
          <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
        </p>

        <p className="text-center text-sm text-text-muted">
          Dispatcher?{" "}
          <Link href="/dispatch/login" className="font-medium text-primary hover:text-primary-hover transition-colors">
            Sign in here
          </Link>
        </p>
      </form>
    </motion.div>
  );
}
