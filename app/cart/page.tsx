"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ChevronLeft, MapPin, ShoppingBag } from "lucide-react";
import { ListingImage, AddressPickerModal } from "@/components/ui";
import DeliveryTypeSelector from "@/components/checkout/DeliveryTypeSelector";
import PlacesAddressInput from "@/components/checkout/PlacesAddressInput";
import { groupBySeller, calculateGrandTotal } from "@/app/api/orders/utils";
import type { CartItemWithListing, SellerGroup } from "@/app/api/orders/utils";
import { getSessionCart, removeFromSessionCart } from "@/lib/session-cart";
import { useMe } from "@/lib/hooks/useAuth";

function CartSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl border border-border bg-card animate-pulse shadow-sm"
          />
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card h-80 animate-pulse shadow-md" />
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
  showDeliveryFee?: boolean;
  deliveryFeeHint?: string;
};

function SummaryPanel({
  groups,
  grandTotal,
  checkingOut,
  error,
  ctaLabel,
  formId,
  onCheckout,
  showDeliveryFee,
  deliveryFeeHint,
}: SummaryPanelProps) {
  const buttonProps = formId
    ? { form: formId, type: "submit" as const }
    : { type: "button" as const, onClick: onCheckout };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sticky top-20 self-start shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <ShoppingBag size={16} className="text-primary" />
        </div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">
          Order summary
        </p>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.seller_id} className="space-y-1.5">
            {group.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3"
              >
                <span className="text-sm text-text truncate">
                  {item.listing.title}
                </span>
                <span className="text-sm text-text shrink-0">
                  ₦{item.listing.price.toLocaleString()}
                </span>
              </div>
            ))}
            {showDeliveryFee !== false && group.delivery_fee > 0 && (
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

      {deliveryFeeHint && (
        <p className="text-xs text-text-muted mt-2">{deliveryFeeHint}</p>
      )}

      <div className="border-t border-border my-6" />

      <div className="bg-gradient-to-br from-surface to-card rounded-xl p-4 mb-6">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-text-muted">Total</span>
          <span className="font-display text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            ₦{grandTotal.toLocaleString()}
          </span>
        </div>
      </div>

      <button
        {...buttonProps}
        disabled={checkingOut}
        className="w-full rounded-xl bg-gradient-to-r from-foreground to-foreground/90 text-white py-4 text-sm font-semibold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
      >
        {checkingOut ? "Preparing…" : ctaLabel}
      </button>

      {error && <p className="mt-3 text-sm text-error text-center">{error}</p>}
    </div>
  );
}

export default function CartPage() {
  const { data: user, isLoading: userLoading } = useMe();
  const [items, setItems] = useState<CartItemWithListing[]>([]);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [showBuyerForm, setShowBuyerForm] = useState(false);
  const [buyerInfo, setBuyerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    address_state: null as string | null,
  });
  const [showDeliveryStep, setShowDeliveryStep] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryState, setDeliveryState] = useState<string | null>(null);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);

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

  async function submitOrder(address: string | null, state: string | null = null) {
    setCheckingOut(true);
    setError("");
    const body: Record<string, unknown> = { delivery_type: deliveryType };
    if (address) body.delivery_address = address.trim();
    if (deliveryType === "delivery") body.delivery_state = state ?? null;
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setCheckingOut(false);
    if (!res.ok) {
      setError(data.error?.message ?? "Checkout failed, please try again");
      return;
    }
    sessionStorage.setItem("checkout_reference", data.data.reference);
    window.location.href = data.data.authorization_url;
  }

  async function handleCheckout() {
    if (!user) {
      setShowBuyerForm(true);
      return;
    }
    if (deliveryType === "delivery") {
      setError("");
      setDeliveryAddress(user?.address ?? "");
      setDeliveryState(user?.address_state ?? null);
      setShowDeliveryStep(true);
      return;
    }
    await submitOrder(null);
  }

  async function handleAnonymousCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (deliveryType === "delivery" && !buyerInfo.address) {
      setError("Please search for and select a delivery address");
      return;
    }
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
    sessionStorage.setItem("checkout_reference", data.data.reference);
    window.location.href = data.data.authorization_url;
  }

  async function handleDeliveryAddressConfirm() {
    const addr = deliveryAddress.trim();
    if (!addr) {
      setError("Please select a delivery address");
      return;
    }
    await submitOrder(addr, deliveryState);
  }

  const groups = groupBySeller(items, deliveryType);
  const grandTotal = calculateGrandTotal(groups);
  const itemsSubtotal = items.reduce((sum, i) => sum + i.listing.price, 0);

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
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
              <ShoppingBag size={40} className="text-primary/60" />
            </div>
            <h2 className="font-display text-3xl text-text mb-3">
              Your cart is empty
            </h2>
            <p className="text-text-muted text-base mb-10 max-w-sm">
              Discover amazing secondhand items and start adding them to your cart.
            </p>
            <Link
              href="/"
              className="rounded-xl bg-gradient-to-r from-foreground to-foreground/90 text-white px-8 py-3.5 text-sm font-semibold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
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
    const hasAnonAddress = Boolean(buyerInfo.address_state);
    const anonGroups =
      deliveryType === "delivery" && hasAnonAddress
        ? groupBySeller(items, "delivery", buyerInfo.address_state)
        : groups;
    const anonGrandTotal = calculateGrandTotal(anonGroups);
    const anonDisplayTotal = deliveryType === "delivery" && !hasAnonAddress ? itemsSubtotal : anonGrandTotal;

    return (
      <main className="min-h-screen bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h1 className="font-display text-3xl font-bold text-text mb-10">
            Your cart
          </h1>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 items-start">
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
                  <PlacesAddressInput
                    label={deliveryType === "delivery" ? "Delivery address" : "Contact address"}
                    placeholder={
                      deliveryType === "delivery"
                        ? "Search for your delivery address"
                        : "Search for your address"
                    }
                    required
                    onSelect={(result) =>
                      setBuyerInfo({
                        ...buyerInfo,
                        address: result.formatted_address,
                        address_state: result.state,
                      })
                    }
                    onClear={() =>
                      setBuyerInfo({ ...buyerInfo, address: "", address_state: null })
                    }
                  />
                </div>
              </form>
            </div>

            <div className="lg:sticky lg:top-20">
              <SummaryPanel
                groups={anonGroups}
                grandTotal={anonDisplayTotal}
                checkingOut={checkingOut}
                error={error}
                ctaLabel="Continue to payment"
                formId="buyer-form"
                showDeliveryFee={deliveryType !== "delivery" || hasAnonAddress}
                deliveryFeeHint={deliveryType === "delivery" && !hasAnonAddress ? "Delivery fee calculated after entering address" : undefined}
              />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Delivery address step (logged-in users, delivery only) ───────────────

  if (showDeliveryStep && user) {
    const feeKnown = deliveryState !== null;
    const deliveryGroups = groupBySeller(items, "delivery", deliveryState ?? null);
    const deliveryGrandTotal = calculateGrandTotal(deliveryGroups);
    const deliveryDisplayTotal = feeKnown
      ? deliveryGrandTotal
      : deliveryGroups.reduce((sum, g) => sum + g.subtotal, 0);

    return (
      <main className="min-h-screen bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h1 className="font-display text-3xl font-bold text-text mb-10">
            Your cart
          </h1>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 items-start">
            <div>
              <button
                onClick={() => {
                  setShowDeliveryStep(false);
                  setError("");
                }}
                className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors mb-6"
              >
                <ChevronLeft size={16} />
                Back to cart
              </button>

              <h2 className="font-display text-2xl font-bold text-text mb-6">
                Where should we deliver?
              </h2>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text">
                  Delivery address <span className="text-error">*</span>
                </label>
                <div
                  className={[
                    "flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                    deliveryAddress ? "border-border bg-card" : "border-border bg-surface",
                  ].join(" ")}
                >
                  <MapPin size={15} className="shrink-0 text-text-muted" strokeWidth={2} />
                  <span className={`flex-1 text-sm truncate ${deliveryAddress ? "text-text" : "text-text-subtle"}`}>
                    {deliveryAddress || "No address selected"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddressPickerOpen(true)}
                    className="shrink-0 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                  >
                    {deliveryAddress ? "Change" : "Choose"}
                  </button>
                </div>
              </div>

              <AddressPickerModal
                open={addressPickerOpen}
                onClose={() => setAddressPickerOpen(false)}
                title="Delivery address"
                currentAddress={deliveryAddress || null}
                onConfirm={(address, state) => {
                  setDeliveryAddress(address);
                  setDeliveryState(state);
                  setError("");
                }}
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 sticky top-20 self-start shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <ShoppingBag size={16} className="text-primary" />
                </div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">
                  Order summary
                </p>
              </div>
              <div className="space-y-4">
                {deliveryGroups.map((group) => (
                  <div key={group.seller_id} className="space-y-1.5">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3"
                      >
                        <span className="text-sm text-text truncate">
                          {item.listing.title}
                        </span>
                        <span className="text-sm text-text shrink-0">
                          ₦{item.listing.price.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    {feeKnown && group.delivery_fee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-text-muted">
                          Delivery
                        </span>
                        <span className="text-sm text-text-muted">
                          ₦{group.delivery_fee.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {!feeKnown && (
                <p className="text-xs text-text-muted mt-2">
                  Delivery fee calculated after entering address
                </p>
              )}
              <div className="border-t border-border my-6" />
              <div className="bg-gradient-to-br from-surface to-card rounded-xl p-4 mb-6">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-text-muted">
                    Total
                  </span>
                  <span className="font-display text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    ₦{deliveryDisplayTotal.toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={handleDeliveryAddressConfirm}
                disabled={checkingOut}
                className="w-full rounded-xl bg-gradient-to-r from-foreground to-foreground/90 text-white py-4 text-sm font-semibold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                {checkingOut ? "Preparing…" : "Continue to payment"}
              </button>
              {error && (
                <p className="mt-3 text-sm text-error text-center">{error}</p>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Main cart ────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-baseline gap-3 mb-12">
          <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-text to-text/80 bg-clip-text text-transparent">
            Your cart
          </h1>
          <span className="text-base text-text-muted font-medium">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 items-start">
          {/* Left: item list + delivery selector */}
          <div>
            <div className="space-y-4 mb-10">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-5 rounded-2xl border border-border bg-card p-5 hover:shadow-md hover:border-border-strong transition-all duration-200"
                >
                  <div className="relative h-[96px] w-[96px] shrink-0 overflow-hidden rounded-xl bg-border ring-1 ring-border group-hover:ring-2 group-hover:ring-primary/20 transition-all duration-200">
                    {item.listing.images?.[0] && (
                      <ListingImage
                        src={item.listing.images[0]}
                        alt={item.listing.title}
                        fill
                        sizes="96px"
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base text-text truncate group-hover:text-primary transition-colors">
                      {item.listing.title}
                    </p>
                    {item.listing.area && (
                      <p className="flex items-center gap-1.5 text-xs text-text-muted mt-1.5">
                        <MapPin size={12} />
                        {item.listing.area}
                      </p>
                    )}
                    <p className="font-display text-2xl font-bold text-text mt-2">
                      ₦{item.listing.price.toLocaleString()}
                    </p>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.listing.title}`}
                    className="shrink-0 p-2 rounded-lg text-text-subtle hover:text-error hover:bg-error/10 hover:scale-110 active:scale-95 transition-all duration-200"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>

            <DeliveryTypeSelector
              value={deliveryType}
              onChange={setDeliveryType}
            />
          </div>

          {/* Right: sticky summary panel */}
          <div className="lg:sticky lg:top-20">
            <SummaryPanel
              groups={groups}
              grandTotal={deliveryType === "pickup" ? grandTotal : itemsSubtotal}
              checkingOut={checkingOut}
              error={error}
              ctaLabel="Proceed to checkout"
              onCheckout={handleCheckout}
              showDeliveryFee={false}
              deliveryFeeHint={deliveryType === "delivery" ? "Delivery fee calculated after entering address" : undefined}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
