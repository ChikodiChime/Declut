"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { clearSessionCart } from "@/lib/session-cart";
import { useMe } from "@/lib/hooks/useAuth";

const ORDERS_URL = "/dashboard/orders?tab=purchases";
const LOGIN_THEN_ORDERS_URL =
  "/auth/login?next=/dashboard/orders%3Ftab%3Dpurchases";

function SuccessContent() {
  const { data: me, isLoading } = useMe();
  const searchParams = useSearchParams();

  useEffect(() => {
    clearSessionCart();

    const reference =
      searchParams.get("reference") ??
      searchParams.get("trxref") ??
      sessionStorage.getItem("checkout_reference");

    if (reference) {
      sessionStorage.removeItem("checkout_reference");
    }

    Promise.allSettled([
      reference
        ? fetch("/api/orders/settle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference }),
          })
        : Promise.resolve(),
      fetch("/api/cart", { method: "DELETE" }),
    ]).finally(() => {
      window.dispatchEvent(new Event("cart-updated"));
    });
  }, [searchParams]);

  const trackHref = isLoading || me ? ORDERS_URL : LOGIN_THEN_ORDERS_URL;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success-bg mb-6">
        <CheckCircle size={32} className="text-success" strokeWidth={1.5} />
      </div>

      <h1 className="font-display text-3xl font-bold text-text mb-2">
        Payment successful
      </h1>
      <p className="text-text-muted text-sm max-w-sm mb-2">
        Your order has been placed. The seller will be in touch within 12
        hours to arrange delivery or pickup.
      </p>
      <p className="text-text-subtle text-xs mb-10">
        A confirmation has been sent to your email.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href={trackHref}
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity"
          style={{ background: "#4f46e5" }}
        >
          Track your order
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium hover:bg-card transition-colors"
        >
          Continue browsing
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <Suspense>
          <SuccessContent />
        </Suspense>
      </div>
    </main>
  );
}
