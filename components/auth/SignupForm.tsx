// components/auth/SignupForm.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Input, CustomDropdown, Button } from "@/components/ui";

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
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAccountTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, accountType: value as "individual" | "business" }));
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

  const accountTypeOptions = [
    { value: "individual", label: "Individual — Personal account" },
    { value: "business",   label: "Business — Commercial account" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-text">Create your account</h2>
        <p className="mt-1.5 text-sm text-text-muted">
          Already have one?{" "}
          <Link href="/auth/login" className="font-medium text-primary hover:text-primary-hover">
            Sign in
          </Link>
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <CustomDropdown
          label="Account type"
          value={formData.accountType}
          onChange={handleAccountTypeChange}
          options={accountTypeOptions}
          placeholder="Select account type"
        />

        <Input
          id="name"
          name="name"
          type="text"
          label={formData.accountType === "business" ? "Business name" : "Full name"}
          required
          value={formData.name}
          onChange={handleChange}
          placeholder={formData.accountType === "business" ? "Acme Ltd." : "John Doe"}
        />

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
          autoComplete="new-password"
          required
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          error={passwordError || undefined}
        />

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
          {isPending ? "Creating account…" : "Create Account"}
        </Button>
      </form>
    </div>
  );
}
