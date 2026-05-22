"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, ChevronLeft, MapPin } from "lucide-react";
import { ListingImage } from "@/components/ui";
import DeliveryTypeSelector from "@/components/checkout/DeliveryTypeSelector";
import {
  groupBySeller,
  calculateGrandTotal,
} from "@/app/api/orders/utils";
import type { CartItemWithListing, SellerGroup } from "@/app/api/orders/utils";
import { getSessionCart, removeFromSessionCart } from "@/lib/session-cart";
import { useMe } from "@/lib/hooks/useAuth";


function CartSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl border border-border bg-card animate-pulse"
          />
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card h-64 animate-pulse" />
    </div>
  );
}

type SummaryPanelProps = {
  groups: SellerGroup[];
  grandTotal: number;
  checkingOut: boolean;
  error: string;
  ctaLabel: string;
  formId?: string;
  onCheckout?: () => void;
};

function SummaryPanel({
  groups,
  grandTotal,
  checkingOut,
  error,
  ctaLabel,
  formId,
  onCheckout,
}: SummaryPanelProps) {
  const buttonProps = formId
    ? { form: formId, type: "submit" as const }
    : { type: "button" as const, onClick: onCheckout };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sticky top-20 self-start">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-5">
        Order summary
      </p>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.seller_id} className="space-y-1.5">
            {group.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3">
                <span className="text-sm text-text truncate">{item.listing.title}</span>
                <span className="text-sm text-text shrink-0">
                  ₦{item.listing.price.toLocaleString()}
                </span>
              </div>
            ))}
            {group.delivery_fee > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-text-muted">Delivery</span>
                <span className="text-sm text-text-muted">
                  ₦{group.delivery_fee.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border my-5" />

      <div className="flex items-baseline justify-between mb-6">
        <span className="text-sm font-medium text-text-muted">Total</span>
        <span className="font-display text-2xl font-bold text-text">
          ₦{grandTotal.toLocaleString()}
        </span>
      </div>

      <button
        {...buttonProps}
        disabled={checkingOut}
        className="w-full rounded-xl bg-foreground text-white py-3.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {checkingOut ? "Preparing…" : ctaLabel}
      </button>

      {error && (
        <p className="mt-3 text-sm text-error text-center">{error}</p>
      )}
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useMe();
  const [items, setItems] = useState<CartItemWithListing[]>([]);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [showBuyerForm, setShowBuyerForm] = useState(false);
  const [buyerInfo, setBuyerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    async function fetchCart() {
      if (userLoading) return;
      if (user) {
        const res = await fetch("/api/cart");
        const data = await res.json();
        setItems(data.data ?? []);
      } else {
        const sessionCart = getSessionCart();
        if (sessionCart.length > 0) {
          const listingIds = sessionCart.map((i) => i.listing_id).join(",");
          const res = await fetch(`/api/cart?listing_ids=${listingIds}`);
          const data = await res.json();
          setItems(data.data ?? []);
        }
      }
      setLoading(false);
    }
    fetchCart();
  }, [user, userLoading]);

  async function removeItem(cartItemId: string) {
    if (user) {
      await fetch(`/api/cart/${cartItemId}`, { method: "DELETE" });
    } else {
      removeFromSessionCart(cartItemId);
    }
    setItems((prev) => prev.filter((i) => i.id !== cartItemId));
    window.dispatchEvent(new Event("cart-updated"));
  }

  async function handleCheckout() {
    if (!user) {
      setShowBuyerForm(true);
      return;
    }
    setCheckingOut(true);
    setError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delivery_type: deliveryType }),
    });
    const data = await res.json();
    setCheckingOut(false);
    if (!res.ok) {
      setError(data.error?.message ?? "Checkout failed, please try again");
      return;
    }
    sessionStorage.setItem('checkout_secret', data.data.client_secret);
    router.push('/checkout');
  }

  async function handleAnonymousCheckout(e: React.FormEvent) {
    e.preventDefault();
    setCheckingOut(true);
    setError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        delivery_type: deliveryType,
        listing_ids: items.map((i) => i.listing_id),
        buyer_info: buyerInfo,
      }),
    });
    const data = await res.json();
    setCheckingOut(false);
    if (!res.ok) {
      setError(data.error?.message ?? "Checkout failed, please try again");
      return;
    }
    sessionStorage.setItem('checkout_secret', data.data.client_secret);
    router.push('/checkout');
  }

  const groups = groupBySeller(items, deliveryType);
  const grandTotal = calculateGrandTotal(groups);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="h-9 w-32 rounded-xl bg-border animate-pulse mb-10" />
          <CartSkeleton />
        </div>
      </main>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h1 className="font-display text-3xl font-bold text-text mb-10">
            Your cart
          </h1>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <h2 className="font-display text-2xl text-text mb-2">
              Nothing here yet
            </h2>
            <p className="text-text-muted text-sm mb-8">
              Browse listings and add items to your cart.
            </p>
            <Link
              href="/listings"
              className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium hover:bg-card transition-colors"
            >
              Browse listings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Anonymous buyer form ─────────────────────────────────────────────────

  if (showBuyerForm && !user) {
    return (
      <main className="min-h-screen bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h1 className="font-display text-3xl font-bold text-text mb-10">
            Your cart
          </h1>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">
            <div>
              <button
                onClick={() => setShowBuyerForm(false)}
                className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors mb-6"
              >
                <ChevronLeft size={16} />
                Back to cart
              </button>

              <h2 className="font-display text-2xl font-bold text-text mb-6">
                Your details
              </h2>

              <form
                id="buyer-form"
                onSubmit={handleAnonymousCheckout}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Full name
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerInfo.name}
                    onChange={(e) =>
                      setBuyerInfo({ ...buyerInfo, name: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-primary transition-colors"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={buyerInfo.email}
                    onChange={(e) =>
                      setBuyerInfo({ ...buyerInfo, email: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-primary transition-colors"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    required
                    value={buyerInfo.phone}
                    onChange={(e) =>
                      setBuyerInfo({ ...buyerInfo, phone: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-primary transition-colors"
                    placeholder="+234 800 000 0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    {deliveryType === "delivery"
                      ? "Delivery address"
                      : "Contact address"}
                  </label>
                  <textarea
                    required
                    value={buyerInfo.address}
                    onChange={(e) =>
                      setBuyerInfo({ ...buyerInfo, address: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-primary transition-colors min-h-[90px] resize-none"
                    placeholder="Enter your full address"
                  />
                </div>
              </form>
            </div>

            <SummaryPanel
              groups={groups}
              grandTotal={grandTotal}
              checkingOut={checkingOut}
              error={error}
              ctaLabel="Continue to payment"
              formId="buyer-form"
            />
          </div>
        </div>
      </main>
    );
  }

  // ── Main cart ────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-baseline gap-3 mb-10">
          <h1 className="font-display text-3xl font-bold text-text">
            Your cart
          </h1>
          <span className="text-sm text-text-muted">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">
          {/* Left: item list + delivery selector */}
          <div>
            <div className="space-y-3 mb-8">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-border">
                    {item.listing.images?.[0] && (
                      <ListingImage
                        src={item.listing.images[0]}
                        alt={item.listing.title}
                        fill
                        sizes="72px"
                        className="object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[15px] text-text truncate">
                      {item.listing.title}
                    </p>
                    {item.listing.area && (
                      <p className="flex items-center gap-1 text-xs text-text-subtle mt-0.5">
                        <MapPin size={11} />
                        {item.listing.area}
                      </p>
                    )}
                    <p className="font-display text-xl text-text mt-1">
                      ₦{item.listing.price.toLocaleString()}
                    </p>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.listing.title}`}
                    className="shrink-0 p-1.5 rounded-lg text-text-subtle hover:text-error hover:bg-error-bg transition-all"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>

            <DeliveryTypeSelector value={deliveryType} onChange={setDeliveryType} />
          </div>

          {/* Right: sticky summary panel */}
          <SummaryPanel
            groups={groups}
            grandTotal={grandTotal}
            checkingOut={checkingOut}
            error={error}
            ctaLabel="Proceed to checkout"
            onCheckout={handleCheckout}
          />
        </div>
      </div>
    </main>
  );
}
