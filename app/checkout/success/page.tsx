"use client";

import { useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Package } from "lucide-react";
import { clearSessionCart } from "@/lib/session-cart";
import { useMe } from "@/lib/hooks/useAuth";
import { useOrdersModal } from "@/lib/context/orders-modal-context";
import type { BuyerOrderDetail } from "@/lib/hooks/useBuyerOrders";

const ORDERS_URL = "/dashboard/orders?tab=purchases";
const LOGIN_THEN_ORDERS_URL =
  "/auth/login?next=/dashboard/orders%3Ftab%3Dpurchases";

function SuccessContent() {
  const { data: me, isLoading } = useMe();
  const searchParams = useSearchParams();
  const { openByReference, openList, referenceOrders } = useOrdersModal();
  const didFetch = useRef(false);

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

      // Must run after settle so orders exist in DB before we query them
      if (reference && !didFetch.current) {
        didFetch.current = true;
        fetch(`/api/orders/by-reference?ref=${encodeURIComponent(reference)}`)
          .then((r) => r.json())
          .then((json: { data?: BuyerOrderDetail[] }) => {
            if (json.data && json.data.length > 0) {
              openByReference(json.data);
            }
          })
          .catch(() => {
            // Silently fail — fallback link still works
          });
      }
    });
  }, [searchParams]); // openByReference is stable (useCallback with [] deps)

  const fallbackHref = isLoading || me ? ORDERS_URL : LOGIN_THEN_ORDERS_URL;

  function handleTrackClick() {
    if (referenceOrders) openByReference(referenceOrders)
  }

  const hasReferenceOrders = referenceOrders && referenceOrders.length > 0;

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
        {hasReferenceOrders ? (
          <button
            onClick={handleTrackClick}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#4f46e5" }}
          >
            <Package size={15} strokeWidth={2} />
            Track your order
          </button>
        ) : (
          <Link
            href={fallbackHref}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#4f46e5" }}
          >
            Track your order
          </Link>
        )}
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
