"use client";
import React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  href?: string;
}

const base =
  "inline-flex items-center justify-center font-semibold transition-all duration-200 " +
  "focus:outline-none focus:ring-2 focus:ring-offset-2 " +
  "disabled:opacity-50 disabled:cursor-not-allowed rounded-md";

const variants: Record<string, string> = {
  primary: "bg-primary text-white shadow-sm hover:bg-primary-hover focus:ring-primary",
  accent: "bg-accent text-white shadow-sm hover:bg-accent-hover focus:ring-accent",
  outline: "border border-border bg-card text-text shadow-sm hover:bg-gray-50 focus:ring-primary",
};

const sizes: Record<string, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      loading = false,
      children,
      disabled,
      href,
      ...props
    },
    ref,
  ) => {
    const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

    if (href) {
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }

    return (
      <button className={classes} ref={ref} disabled={disabled || loading} {...props}>
        {loading && (
          <Loader2 size={16} className="animate-spin -ml-1 mr-2 shrink-0" strokeWidth={2.5} />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
export { Button };
