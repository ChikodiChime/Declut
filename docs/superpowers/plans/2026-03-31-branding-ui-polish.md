# Branding & UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the declut logo/icon, establish a design token system in globals.css, and apply polished branded styling across all pages and components.

**Architecture:** SVG assets go in `public/`, design tokens live in `@theme inline` inside `app/globals.css` and are consumed as Tailwind utilities (`bg-primary`, `text-text-muted`, `shadow-card`, etc.) throughout the app. Pages wrap form components in a shared card pattern (inline, not abstracted — only 3 pages). Form components lose their outer wrapper divs (the page now owns layout); their inner content gets polished.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS 4 (`@theme inline`), SVG, Resend (email template update)

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `public/logo.svg` | Full horizontal logo (icon + wordmark) |
| Create | `public/icon.svg` | Icon only (tag + spark) — used in pages |
| Create | `public/favicon.svg` | Same as icon.svg — browser tab favicon |
| Modify | `app/globals.css` | Add design tokens to `@theme inline` |
| Modify | `app/layout.tsx` | Update metadata (title, description, icons) |
| Modify | `components/ui/Button.tsx` | Add `accent` variant; use token-based classes |
| Modify | `components/ui/Input.tsx` | Apply border/radius/focus tokens |
| Modify | `components/ui/CustomDropdown.tsx` | Match Input styling with tokens |
| Modify | `app/page.tsx` | Full home page redesign with logo + decorative circles |
| Modify | `app/auth/login/page.tsx` | Card wrapper + logo |
| Modify | `app/auth/signup/page.tsx` | Card wrapper + logo |
| Modify | `app/verify-email/page.tsx` | Card wrapper + logo |
| Modify | `components/auth/LoginForm.tsx` | Remove outer wrapper; polish heading + spacing |
| Modify | `components/auth/SignupForm.tsx` | Remove outer wrapper; polish heading + spacing |
| Modify | `components/auth/VerifyEmailForm.tsx` | Remove outer wrapper; polish OTP boxes |
| Modify | `lib/email.ts` | Two-tone "declut" wordmark in email header |

---

### Task 1: Design tokens in globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace globals.css**

```css
/* app/globals.css */
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  /* Existing — keep these */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  /* Brand colors */
  --color-primary:        #4F46E5;
  --color-primary-hover:  #4338CA;
  --color-accent:         #F59E0B;
  --color-accent-hover:   #D97706;
  --color-surface:        #F8FAFF;
  --color-card:           #FFFFFF;
  --color-text:           #0F172A;
  --color-text-muted:     #64748B;
  --color-border:         #E2E8F0;
  --color-error:          #EF4444;
  --color-error-bg:       #FEF2F2;

  /* Radii — override Tailwind defaults */
  --radius-sm:  8px;
  --radius-md:  12px;
  --radius-lg:  16px;
  --radius-xl:  24px;

  /* Shadows (indigo-tinted) */
  --shadow-card:     0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(79,70,229,0.06);
  --shadow-elevated: 0 4px 6px rgba(0,0,0,0.07), 0 10px 32px rgba(79,70,229,0.12);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background-color: #F8FAFF;
  color: #0F172A;
  font-family: var(--font-geist-sans), Arial, Helvetica, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 2: Verify the dev server still starts**

Run: `npm run dev`
Expected: Server starts at http://localhost:3000 with no errors.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add brand design tokens to globals.css"
```

---

### Task 2: SVG logo and icon assets

**Files:**
- Create: `public/logo.svg`
- Create: `public/icon.svg`
- Create: `public/favicon.svg`

- [ ] **Step 1: Create public/icon.svg**

The icon is a vertical price tag (rounded top corners, pointed bottom) in indigo, with a white string hole near the top and an amber 4-pointed star spark at the lower-right.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 44" fill="none">
  <!-- Price tag body: rounded top corners, pointed at bottom -->
  <path
    d="M8,3 C6,3 4,5 4,7 L4,29 L20,43 L36,29 L36,7 C36,5 34,3 32,3 Z"
    fill="#4F46E5"
  />
  <!-- String hole -->
  <circle cx="20" cy="11" r="3.5" fill="white"/>
  <!-- 4-pointed amber spark (centered at 33,32) -->
  <path
    d="M33,27 L34.4,30.6 L38,32 L34.4,33.4 L33,37 L31.6,33.4 L28,32 L31.6,30.6 Z"
    fill="#F59E0B"
  />
</svg>
```

- [ ] **Step 2: Create public/favicon.svg**

Identical to icon.svg — browsers use this for the tab favicon.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 44" fill="none">
  <path
    d="M8,3 C6,3 4,5 4,7 L4,29 L20,43 L36,29 L36,7 C36,5 34,3 32,3 Z"
    fill="#4F46E5"
  />
  <circle cx="20" cy="11" r="3.5" fill="white"/>
  <path
    d="M33,27 L34.4,30.6 L38,32 L34.4,33.4 L33,37 L31.6,33.4 L28,32 L31.6,30.6 Z"
    fill="#F59E0B"
  />
</svg>
```

- [ ] **Step 3: Create public/logo.svg**

Full horizontal logo: icon on the left, "declut" wordmark on the right ("decl" in slate-900, "ut" in indigo). The icon is scaled to 40px tall, vertically centred in a 50px-tall canvas. Total width 185px.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 185 50" fill="none">
  <!-- Icon: tag body scaled to fit 40x44, centred vertically (offset y=3) -->
  <g transform="translate(0,3)">
    <path
      d="M8,0 C6,0 4,2 4,4 L4,26 L20,40 L36,26 L36,4 C36,2 34,0 32,0 Z"
      fill="#4F46E5"
    />
    <circle cx="20" cy="8" r="3.5" fill="white"/>
    <path
      d="M33,24 L34.4,27.6 L38,29 L34.4,30.4 L33,34 L31.6,30.4 L28,29 L31.6,27.6 Z"
      fill="#F59E0B"
    />
  </g>
  <!-- Wordmark: "decl" slate-900, "ut" indigo -->
  <text
    x="50"
    y="34"
    font-family="Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    font-weight="800"
    font-size="26"
    letter-spacing="-0.5"
  >
    <tspan fill="#0F172A">decl</tspan><tspan fill="#4F46E5">ut</tspan>
  </text>
</svg>
```

- [ ] **Step 4: Verify assets render in the browser**

Navigate to http://localhost:3000/logo.svg, http://localhost:3000/icon.svg, http://localhost:3000/favicon.svg.
Expected: All three SVGs render correctly — tag shape visible, amber spark visible, wordmark readable.

- [ ] **Step 5: Commit**

```bash
git add public/logo.svg public/icon.svg public/favicon.svg
git commit -m "feat: add declut logo and icon SVG assets"
```

---

### Task 3: Metadata update

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update the metadata export**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "declut",
  description: "Nigeria's marketplace for things that deserve a second home",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to http://localhost:3000. Check the browser tab — it should show "declut" as the title and the indigo tag icon as the favicon.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: update metadata — title, description, favicon"
```

---

### Task 4: Button component polish

**Files:**
- Modify: `components/ui/Button.tsx`

- [ ] **Step 1: Replace Button.tsx**

Changes: add `accent` variant; remove `secondary` variant (unused in spec); use token-based classes; `rounded-lg` → `rounded-md` (now 12px via our token).

```tsx
// components/ui/Button.tsx
import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      loading = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const base =
      "inline-flex items-center justify-center font-semibold transition-all duration-200 " +
      "focus:outline-none focus:ring-2 focus:ring-offset-2 " +
      "disabled:opacity-50 disabled:cursor-not-allowed rounded-md";

    const variants: Record<string, string> = {
      primary:
        "bg-primary text-white shadow-sm hover:bg-primary-hover focus:ring-primary",
      accent:
        "bg-accent text-white shadow-sm hover:bg-accent-hover focus:ring-accent",
      outline:
        "border border-border bg-card text-text shadow-sm hover:bg-gray-50 focus:ring-primary",
    };

    const sizes: Record<string, string> = {
      sm: "px-3 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    };

    return (
      <button
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
export { Button };
```

- [ ] **Step 2: Update the ButtonProps type export in components/ui/index.ts**

Open `components/ui/index.ts`. The `ButtonProps` export already exists — no change needed there. But confirm that no file imports the removed `secondary` variant.

Run: `grep -r "secondary" components/ app/`
Expected: No results (the `secondary` variant was unused).

- [ ] **Step 3: Run existing tests**

Run: `npx vitest run`
Expected: All tests pass (button has no unit tests — this confirms no imports broke).

- [ ] **Step 4: Commit**

```bash
git add components/ui/Button.tsx
git commit -m "feat: polish Button — accent variant, design token classes"
```

---

### Task 5: Input and CustomDropdown component polish

**Files:**
- Modify: `components/ui/Input.tsx`
- Modify: `components/ui/CustomDropdown.tsx`

- [ ] **Step 1: Replace Input.tsx**

```tsx
// components/ui/Input.tsx
import React, { useId } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, helperText, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text"
          >
            {label}
          </label>
        )}

        <input
          id={inputId}
          ref={ref}
          className={[
            "block w-full px-4 py-3 text-text placeholder-text-muted",
            "bg-card border rounded-md shadow-sm appearance-none",
            "transition duration-200 ease-in-out focus:outline-none focus:ring-2",
            error
              ? "border-error focus:border-error focus:ring-error/20"
              : "border-border focus:border-primary focus:ring-primary/20",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />

        {error && (
          <p className="text-sm text-error">{error}</p>
        )}

        {helperText && !error && (
          <p className="text-sm text-text-muted">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export { Input };
```

- [ ] **Step 2: Replace CustomDropdown.tsx**

```tsx
// components/ui/CustomDropdown.tsx
import { useState, useRef, useEffect, useId } from "react";

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface CustomDropdownProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const CustomDropdown = ({
  label,
  error,
  helperText,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  className = "",
}: CustomDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<DropdownOption | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const dropdownId = `dropdown-${generatedId}`;

  const currentOption = value
    ? options.find((opt) => opt.value === value) || null
    : selectedOption;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: DropdownOption) => {
    if (option.disabled) return;
    setSelectedOption(option);
    setIsOpen(false);
    onChange?.(option.value);
  };

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      {label && (
        <label htmlFor={dropdownId} className="block text-sm font-medium text-text">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          id={dropdownId}
          onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={[
            "block w-full px-4 py-3 text-left bg-card border rounded-md shadow-sm",
            "transition duration-200 ease-in-out focus:outline-none focus:ring-2 cursor-pointer",
            disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50",
            error
              ? "border-error focus:border-error focus:ring-error/20"
              : isOpen
              ? "border-primary ring-2 ring-primary/20"
              : "border-border focus:border-primary focus:ring-primary/20",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className={`block truncate ${currentOption ? "text-text" : "text-text-muted"}`}>
            {currentOption ? currentOption.label : placeholder}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className={`h-5 w-5 text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-elevated max-h-60 overflow-auto">
            <ul className="py-1" role="listbox">
              {options.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option)}
                    disabled={option.disabled}
                    role="option"
                    aria-selected={currentOption?.value === option.value}
                    className={[
                      "w-full px-4 py-2.5 text-left focus:outline-none transition-colors",
                      option.disabled
                        ? "text-text-muted cursor-not-allowed"
                        : "cursor-pointer",
                      currentOption?.value === option.value
                        ? "bg-indigo-50 text-primary font-medium border-l-2 border-primary pl-3.5"
                        : "text-text hover:bg-indigo-50",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {helperText && !error && <p className="text-sm text-text-muted">{helperText}</p>}
    </div>
  );
};

export { CustomDropdown };
```

- [ ] **Step 3: Run existing tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/ui/Input.tsx components/ui/CustomDropdown.tsx
git commit -m "feat: polish Input and CustomDropdown with design tokens"
```

---

### Task 6: Home page redesign

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace app/page.tsx**

```tsx
// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-surface flex items-center justify-center px-4 overflow-hidden">
      {/* Decorative circle — top-right, indigo tint */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary pointer-events-none"
        style={{ opacity: 0.06, transform: "translate(40%, -40%)" }}
      />
      {/* Decorative circle — bottom-left, amber tint */}
      <div
        className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-accent pointer-events-none"
        style={{ opacity: 0.08, transform: "translate(-40%, 40%)" }}
      />

      {/* Content */}
      <div className="relative w-full max-w-sm text-center space-y-10">
        {/* Logo */}
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="declut" className="h-12" />
        </div>

        {/* Tagline */}
        <p className="text-lg leading-relaxed" style={{ color: "#64748B" }}>
          Nigeria&apos;s marketplace for things that deserve a second home
        </p>

        {/* CTAs */}
        <div className="space-y-3">
          <Link
            href="/auth/login"
            className="flex w-full items-center justify-center rounded-md bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="flex w-full items-center justify-center rounded-md bg-accent px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to http://localhost:3000.
Expected:
- Light surface background (very pale indigo tint)
- Logo centred with icon + "declut" wordmark
- Tagline below logo
- Two full-width buttons: indigo "Sign In" + amber "Create Account"
- Faint decorative circles in corners (barely visible, not distracting)

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: redesign home page with logo, tagline, branded CTAs"
```

---

### Task 7: Auth pages and form components

This task redesigns all three auth pages (login, signup, verify-email) and their form components together. Each page gets the same card wrapper with logo. Each form component loses its outer div (page owns layout now) and gets updated internal classes.

**Files:**
- Modify: `app/auth/login/page.tsx`
- Modify: `components/auth/LoginForm.tsx`
- Modify: `app/auth/signup/page.tsx`
- Modify: `components/auth/SignupForm.tsx`
- Modify: `app/verify-email/page.tsx`
- Modify: `components/auth/VerifyEmailForm.tsx`

- [ ] **Step 1: Replace app/auth/login/page.tsx**

```tsx
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
```

- [ ] **Step 2: Replace components/auth/LoginForm.tsx**

Remove outer `w-full max-w-md` wrapper. Update heading size and spacing. Use token-based classes.

```tsx
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
```

- [ ] **Step 3: Replace app/auth/signup/page.tsx**

```tsx
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
```

- [ ] **Step 4: Replace components/auth/SignupForm.tsx**

Remove outer wrapper. Update heading and spacing to match LoginForm style.

```tsx
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
```

- [ ] **Step 5: Replace app/verify-email/page.tsx**

```tsx
// app/verify-email/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useVerifyEmail, useSendVerification, useMe } from '@/lib/hooks/useAuth'
import VerifyEmailForm from '@/components/auth/VerifyEmailForm'

export default function VerifyEmailPage() {
  const { data: me } = useMe()
  const { mutate: verify, isPending, error } = useVerifyEmail()
  const { mutate: resend, isPending: isResending, data: resendData } = useSendVerification()
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (me?.otp_resend_after) {
      const diff = Math.ceil((new Date(me.otp_resend_after).getTime() - Date.now()) / 1000)
      if (diff > 0) setResendCooldown(diff)
    }
  }, [me])

  useEffect(() => {
    if (resendData?.retryAfter) setResendCooldown(resendData.retryAfter)
  }, [resendData])

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
          <VerifyEmailForm
            onSubmit={(code) => verify(code)}
            onResend={() => resend()}
            isPending={isPending}
            isResending={isResending}
            error={error?.message ?? null}
            resendCooldownSeconds={resendCooldown}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Replace components/auth/VerifyEmailForm.tsx**

Remove outer wrapper div. Polish OTP boxes and spacing to match card layout.

```tsx
// components/auth/VerifyEmailForm.tsx
'use client'

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react'

interface Props {
  onSubmit: (code: string) => void
  onResend: () => void
  isPending: boolean
  isResending: boolean
  error: string | null
  resendCooldownSeconds: number
}

export default function VerifyEmailForm({
  onSubmit,
  onResend,
  isPending,
  isResending,
  error,
  resendCooldownSeconds,
}: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [secondsLeft, setSecondsLeft] = useState(resendCooldownSeconds)
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return
    setSecondsLeft(resendCooldownSeconds)
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendCooldownSeconds])

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const newDigits = [...digits]
    newDigits[index] = value
    setDigits(newDigits)
    if (value && index < 5) inputs.current[index + 1]?.focus()
    const code = newDigits.join('')
    if (newDigits.every((d) => d !== '') && !isPending) onSubmit(code)
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted.length) return
    const newDigits = Array(6).fill('')
    pasted.split('').forEach((ch, i) => { newDigits[i] = ch })
    setDigits(newDigits)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6 && !isPending) onSubmit(pasted)
  }

  const formatCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-text">Check your email</h2>
        <p className="mt-1.5 text-sm text-text-muted">
          We sent a 6-digit code to your email address
        </p>
      </div>

      <div className="space-y-5">
        {/* OTP inputs */}
        <div className="flex justify-center gap-3" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(i, e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(i, e)}
              disabled={isPending}
              className="h-14 w-11 rounded-md border border-border bg-card text-center text-xl font-bold text-text shadow-sm transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none disabled:opacity-50"
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="rounded-md bg-error-bg px-4 py-3 text-center text-sm text-error">
            {error}
          </p>
        )}

        {/* Loading */}
        {isPending && (
          <p className="text-center text-sm text-text-muted">Verifying…</p>
        )}

        {/* Resend */}
        <div className="text-center">
          {secondsLeft > 0 ? (
            <p className="text-sm text-text-muted">
              Resend code in{' '}
              <span className="font-semibold text-text">{formatCountdown(secondsLeft)}</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={onResend}
              disabled={isResending}
              className="text-sm font-medium text-primary hover:text-primary-hover disabled:opacity-50 transition-colors"
            >
              {isResending ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 8: Verify all auth pages in browser**

Navigate to:
- http://localhost:3000/auth/login — logo above card, sign-in form inside card
- http://localhost:3000/auth/signup — logo above card, signup form inside card
- http://localhost:3000/verify-email — logo above card, OTP boxes inside card

Expected on all: surface background, white card with subtle indigo-tinted shadow, logo centred above, form content inside with consistent spacing.

- [ ] **Step 9: Commit**

```bash
git add app/auth/login/page.tsx app/auth/signup/page.tsx app/verify-email/page.tsx \
        components/auth/LoginForm.tsx components/auth/SignupForm.tsx components/auth/VerifyEmailForm.tsx
git commit -m "feat: apply branded card layout to all auth pages"
```

---

### Task 8: Email template update

**Files:**
- Modify: `lib/email.ts`

- [ ] **Step 1: Update the email header in buildOtpHtml**

Replace the `<!-- Header -->` `<tr>` block. Change "Declutter" to the two-tone "declut" wordmark. Also update the footer copyright.

Find this block in `lib/email.ts`:

```html
          <!-- Header -->
          <tr>
            <td style="background:#4F46E5;padding:32px 40px;text-align:center;">
              <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Declutter</span>
            </td>
          </tr>
```

Replace with:

```html
          <!-- Header -->
          <tr>
            <td style="background:#4F46E5;padding:32px 40px;text-align:center;">
              <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">decl<span style="color:#A5B4FC">ut</span></span>
            </td>
          </tr>
```

Then find the footer:

```html
              <p style="margin:0;font-size:12px;color:#9CA3AF;">&copy; 2026 Declutter. All rights reserved.</p>
```

Replace with:

```html
              <p style="margin:0;font-size:12px;color:#9CA3AF;">&copy; 2026 declut. All rights reserved.</p>
```

- [ ] **Step 2: Verify the HTML output**

Add a temporary `console.log` in a test script or inspect the output of `buildOtpHtml('123456')` to confirm the two-tone wordmark renders. Remove the log after verifying.

Alternatively: open the HTML string in a browser to visually verify. The email header should show "decl" in white and "ut" in light indigo (`#A5B4FC`).

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/email.ts
git commit -m "feat: update email template header to declut two-tone wordmark"
```
