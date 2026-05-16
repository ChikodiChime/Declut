"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import DeliveryTypeSelector from "@/components/checkout/DeliveryTypeSelector";
import { groupBySeller, calculateGrandTotal } from "@/app/api/orders/utils";
import type { CartItemWithListing } from "@/app/api/orders/utils";
import { getSessionCart, removeFromSessionCart } from "@/lib/session-cart";
import { useMe } from "@/lib/hooks/useAuth";

export default function CartPage() {
  const router = useRouter();
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
          const listingIds = sessionCart
            .map((item) => item.listing_id)
            .join(",");
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

    const { client_secret } = data.data;
    router.push(`/checkout?client_secret=${encodeURIComponent(client_secret)}`);
  }

  async function handleAnonymousCheckout(e: React.FormEvent) {
    e.preventDefault();
    setCheckingOut(true);
    setError("");

    const listingIds = items.map((item) => item.listing_id);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        delivery_type: deliveryType,
        listing_ids: listingIds,
        buyer_info: buyerInfo,
      }),
    });

    const data = await res.json();
    setCheckingOut(false);

    if (!res.ok) {
      setError(data.error?.message ?? "Checkout failed, please try again");
      return;
    }

    const { client_secret } = data.data;
    router.push(`/checkout?client_secret=${encodeURIComponent(client_secret)}`);
  }

  const groups = groupBySeller(items, deliveryType);
  const grandTotal = calculateGrandTotal(groups);

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400">Loading cart...</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500 mb-4">Your cart is empty.</p>
        <Link href="/listings" className="text-sm underline">
          Browse listings
        </Link>
      </div>
    );
  }

  if (showBuyerForm && !user) {
    return (
      <div className="mx-auto max-w-2xl py-10 px-4">
        <button
          onClick={() => setShowBuyerForm(false)}
          className="mb-6 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to cart
        </button>
        <h1 className="text-2xl font-bold mb-6">Your information</h1>

        <form onSubmit={handleAnonymousCheckout} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              required
              value={buyerInfo.name}
              onChange={(e) =>
                setBuyerInfo({ ...buyerInfo, name: e.target.value })
              }
              className="w-full rounded-lg border px-4 py-2"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={buyerInfo.email}
              onChange={(e) =>
                setBuyerInfo({ ...buyerInfo, email: e.target.value })
              }
              className="w-full rounded-lg border px-4 py-2"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              required
              value={buyerInfo.phone}
              onChange={(e) =>
                setBuyerInfo({ ...buyerInfo, phone: e.target.value })
              }
              className="w-full rounded-lg border px-4 py-2"
              placeholder="+234 800 000 0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {deliveryType === "delivery"
                ? "Delivery Address"
                : "Contact Address"}
            </label>
            <textarea
              required
              value={buyerInfo.address}
              onChange={(e) =>
                setBuyerInfo({ ...buyerInfo, address: e.target.value })
              }
              className="w-full rounded-lg border px-4 py-2 min-h-[80px]"
              placeholder="Enter your full address"
            />
          </div>

          <div className="rounded-xl border p-4 mb-6 text-sm">
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>₦{grandTotal.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Includes delivery fees where applicable
            </p>
          </div>

          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={checkingOut}
            className="w-full rounded-lg bg-black py-3 text-white font-medium disabled:opacity-50"
          >
            {checkingOut ? "Processing..." : "Continue to payment"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Your cart</h1>

      <div className="flex flex-col gap-3 mb-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-xl border p-4"
          >
            {item.listing.images?.[0] && (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${item.listing.images[0]}`}
                  alt={item.listing.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.listing.title}</p>
              <p className="text-sm text-gray-500">
                ₦{item.listing.price.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => removeItem(item.id)}
              className="text-sm text-gray-400 hover:text-red-500"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <DeliveryTypeSelector value={deliveryType} onChange={setDeliveryType} />
      </div>

      <div className="rounded-xl border p-4 mb-6 text-sm">
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span>₦{grandTotal.toLocaleString()}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Includes delivery fees where applicable
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <button
        onClick={handleCheckout}
        disabled={checkingOut}
        className="w-full rounded-lg bg-black py-3 text-white font-medium disabled:opacity-50"
      >
        {checkingOut ? "Preparing checkout..." : "Proceed to checkout"}
      </button>
    </div>
  );
}
