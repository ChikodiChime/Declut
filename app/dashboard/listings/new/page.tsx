"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ListingForm } from "@/components/listings";
import { useCreateListing } from "@/lib/hooks/useListings";
import { useMe } from "@/lib/hooks/useAuth";
import { Wallet, Calendar, TrendingUp, ArrowUpRight } from "lucide-react";
import type { ListingFormData } from "@/types";

const BENEFITS = [
  { icon: Wallet,     label: "Buyers can pay you",   sub: "Stripe processes payments on your behalf" },
  { icon: TrendingUp, label: "You get paid out",      sub: "Earnings go straight to your bank account" },
  { icon: Calendar,   label: "One-time setup",        sub: "Connect once, list as many items as you want" },
];

function StripeGate() {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    setConnecting(true);
    setError("");
    const res = await fetch("/api/stripe/connect", { method: "POST" });
    const data = await res.json();
    setConnecting(false);
    if (!res.ok) {
      setError(data.error?.message ?? "Failed to start Stripe onboarding");
      return;
    }
    window.location.href = data.data.url;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-border bg-card overflow-hidden max-w-3xl mx-auto"
      style={{ boxShadow: "var(--shadow-elevated)" }}
    >
      {/* Hero band */}
      <div className="relative bg-primary px-8 pt-10 pb-16 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M36 0H0V36' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='1'/%3E%3C/svg%3E\")",
            backgroundSize: "36px 36px",
          }}
        />
        <div
          aria-hidden
          className="absolute -right-10 -top-10 w-52 h-52 rounded-full border-[28px] border-white/5 pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute right-32 -bottom-8 w-32 h-32 rounded-full border-[16px] border-white/5 pointer-events-none"
        />

        <div className="relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 mb-5">
            <Wallet size={22} strokeWidth={1.5} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-white leading-tight tracking-tight mb-2">
            You need to connect Stripe first
          </h3>
          <p className="text-sm text-white/65 leading-relaxed max-w-sm">
            Before you can publish a listing, we need a way to send you money
            when something sells. Stripe handles that — securely and automatically.
          </p>
        </div>
      </div>

      {/* Benefit cards — overlap the hero band */}
      <div className="relative z-10 px-8 -mt-8">
        <div className="grid grid-cols-3 gap-3">
          {BENEFITS.map(({ icon: Icon, label, sub }) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-card px-3.5 py-3 shadow-sm"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center mb-2">
                <Icon size={13} strokeWidth={2} className="text-primary" />
              </div>
              <p className="text-xs font-semibold text-text leading-tight">{label}</p>
              <p className="text-[10.5px] text-text-subtle mt-0.5 leading-snug">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-8 py-6">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-60 transition-colors"
        >
          {connecting ? "Opening Stripe…" : "Set up payouts & continue"}
          {!connecting && <ArrowUpRight size={14} strokeWidth={2.5} />}
        </button>
        {error && <p className="mt-3 text-xs text-error">{error}</p>}
      </div>
    </motion.div>
  );
}

export default function NewListingPage() {
  const { data: user, isLoading } = useMe();
  const { mutateAsync: createListing, isPending } = useCreateListing();

  async function handleSubmit(data: ListingFormData) {
    await createListing(data);
  }

  if (isLoading) return null;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">New Listing</h1>
        <p className="text-sm text-text-muted mt-1">
          Fill out the steps below to publish your item.
        </p>
      </div>

      {user?.stripe_onboarding_complete ? (
        <ListingForm onSubmit={handleSubmit} isPending={isPending} />
      ) : (
        <StripeGate />
      )}
    </div>
  );
}
