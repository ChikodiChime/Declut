"use client";

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

interface Props {
  onSubmit: (code: string) => void;
  onResend: () => void;
  isPending: boolean;
  isResending: boolean;
  error: string | null;
  resendCooldownSeconds: number;
}

export default function VerifyEmailForm({
  onSubmit,
  onResend,
  isPending,
  isResending,
  error,
  resendCooldownSeconds,
}: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(resendCooldownSeconds);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return;
    setSecondsLeft(resendCooldownSeconds);
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldownSeconds]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    if (value && index < 5) inputs.current[index + 1]?.focus();
    const code = newDigits.join("");
    if (newDigits.every((d) => d !== "") && !isPending) onSubmit(code);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted.length) return;
    const newDigits = Array(6).fill("");
    pasted.split("").forEach((ch, i) => { newDigits[i] = ch; });
    setDigits(newDigits);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6 && !isPending) onSubmit(pasted);
  };

  const formatCountdown = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Icon */}
      <div className="flex justify-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Mail size={26} className="text-primary" strokeWidth={1.75} />
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-text">Check your email</h1>
        <p className="mt-1.5 text-sm text-text-muted">
          We sent a 6-digit code to your email address
        </p>
      </div>

      {/* OTP inputs */}
      <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <motion.input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(i, e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(i, e)}
            disabled={isPending}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className={[
              "h-14 w-11 rounded-lg border-2 bg-card text-center text-xl font-bold text-text shadow-sm",
              "transition-all duration-150 focus:outline-none disabled:opacity-50",
              digit
                ? "border-primary bg-primary/5"
                : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20",
            ].join(" ")}
          />
        ))}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-lg bg-error-bg px-4 py-3 text-center text-sm text-error"
        >
          {error}
        </motion.p>
      )}

      {isPending && (
        <p className="text-center text-sm text-text-muted">Verifying…</p>
      )}

      {/* Resend */}
      <div className="text-center">
        {secondsLeft > 0 ? (
          <p className="text-sm text-text-muted">
            Resend code in{" "}
            <span className="font-semibold text-text tabular-nums">
              {formatCountdown(secondsLeft)}
            </span>
          </p>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResend}
            disabled={isResending}
            loading={isResending}
            className="gap-1.5"
          >
            <RefreshCw size={14} strokeWidth={2} />
            Resend code
          </Button>
        )}
      </div>
    </motion.div>
  );
}
