// components/ui/Input.tsx
"use client";
import React, { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leadingIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, helperText, id, type, onWheel, leadingIcon, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === "password";
    const isNumber = type === "number";
    const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;

    const handleWheel: React.WheelEventHandler<HTMLInputElement> = (e) => {
      if (isNumber) (e.target as HTMLInputElement).blur();
      onWheel?.(e);
    };

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leadingIcon && (
            <span className="absolute left-3.5 flex items-center pointer-events-none z-10">
              {leadingIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            type={resolvedType}
            onWheel={handleWheel}
            className={[
              "block w-full py-3 text-text placeholder-text-muted",
              "bg-card border rounded-md shadow-sm appearance-none",
              "transition duration-200 ease-in-out focus:outline-none focus:ring-2",
              leadingIcon ? "pl-10 pr-4" : "px-4",
              isPassword ? "pr-11" : "",
              error
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-border focus:border-primary focus:ring-primary/20",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 flex items-center text-text-muted hover:text-text transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff size={18} strokeWidth={1.75} />
              ) : (
                <Eye size={18} strokeWidth={1.75} />
              )}
            </button>
          )}
        </div>

        {error && <p className="text-sm text-error">{error}</p>}
        {helperText && !error && <p className="text-sm text-text-muted">{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
export { Input };
