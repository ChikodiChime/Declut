"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, ShoppingCart } from "lucide-react";
import { ListingImage } from "@/components/ui";
import { ResponsiveDrawer, DrawerHeader } from "@/components/ui";
import { getSessionCart, removeFromSessionCart } from "@/lib/session-cart";
import { useMe } from "@/lib/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { CART_QUERY_KEY } from "@/lib/hooks/useCart";
import type { CartItemWithListing } from "@/app/api/orders/utils";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { data: user } = useMe();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<CartItemWithListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    async function load() {
      try {
        if (user) {
          const res = await fetch("/api/cart", { signal: controller.signal });
          if (!res.ok) throw new Error("fetch failed");
          const data = await res.json();
          setItems(data.data ?? []);
        } else {
          const sessionCart = getSessionCart();
          if (sessionCart.length === 0) {
            setItems([]);
          } else {
            const listingIds = sessionCart.map((i) => i.listing_id).join(",");
            const res = await fetch(`/api/cart?listing_ids=${listingIds}`, { signal: controller.signal });
            if (!res.ok) throw new Error("fetch failed");
            const data = await res.json();
            setItems(data.data ?? []);
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [open, user?.id]);

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);


  async function removeItem(item: CartItemWithListing) {
    const previousItems = items;
    const previousIds = queryClient.getQueryData<string[]>(CART_QUERY_KEY) ?? [];

    setItems((prev) => prev.filter((i) => i.id !== item.id));
    queryClient.setQueryData<string[]>(CART_QUERY_KEY, (prev = []) =>
      prev.filter((id) => id !== item.listing_id),
    );

    try {
      if (user) {
        const res = await fetch(`/api/cart/${item.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("remove failed");
      } else {
        removeFromSessionCart(item.listing_id);
      }
    } catch {
      setItems(previousItems);
      queryClient.setQueryData<string[]>(CART_QUERY_KEY, previousIds);
    }
  }

  function handleNavigate(path: string) {
    onClose();
    router.push(path);
  }

  return (
    <ResponsiveDrawer
      open={open}
      onClose={onClose}
      label="Cart"
      maxWidth={420}
      portal
      panelStyle={{ background: "var(--color-drawer-bg)" }}
    >
        <DrawerHeader
          title="Your Cart"
          onClose={onClose}
          closeButtonRef={closeButtonRef}
          badge={
            items.length > 0 ? (
              <span
                className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold shrink-0"
                style={{ background: "#3730a3", color: "#c7d2fe" }}
              >
                {items.length}
              </span>
            ) : undefined
          }
        />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-5" data-lenis-prevent>
          {loading ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl p-3 animate-pulse"
                  style={{ background: "#ffffff" }}
                >
                  <div className="w-[72px] h-[72px] rounded-xl bg-border shrink-0" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-3 bg-border rounded-full w-4/5" />
                    <div className="h-3 bg-border rounded-full w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "#fef2f2" }}
              >
                <X size={18} strokeWidth={2.5} style={{ color: "#ef4444" }} />
              </div>
              <p className="text-[15px] font-semibold" style={{ color: "#16130f" }}>
                Couldn&apos;t load your cart
              </p>
              <p className="text-sm mt-1.5" style={{ color: "#a8a09a" }}>
                Check your connection and try again
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "#f0ece5" }}
              >
                <ShoppingCart size={24} strokeWidth={1.5} style={{ color: "#78726c" }} />
              </div>
              <p className="font-display text-[18px] font-bold mb-1.5" style={{ color: "#16130f" }}>
                Nothing here yet
              </p>
              <p className="text-sm mb-7" style={{ color: "#a8a09a" }}>
                Browse listings and add items to get started
              </p>
              <button
                onClick={() => handleNavigate("/")}
                className="text-[13px] font-semibold px-6 py-2.5 rounded-full transition-all duration-200"
                style={{
                  background: "#16130f",
                  color: "#ffffff",
                  boxShadow: "0 2px 8px rgba(22,19,15,0.2)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(22,19,15,0.3)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(22,19,15,0.2)";
                }}
              >
                Browse listings
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl p-3"
                  style={{
                    background: "#ffffff",
                    boxShadow: "0 1px 3px rgba(22,19,15,0.06), 0 1px 2px rgba(22,19,15,0.04)",
                  }}
                >
                  <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0">
                    {item.listing.images?.[0] ? (
                      <ListingImage
                        src={item.listing.images[0]}
                        alt={item.listing.title}
                        fill
                        sizes="72px"
                        className="object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: "#f0ece5" }}
                      >
                        <ShoppingCart size={18} strokeWidth={1.5} style={{ color: "#a8a09a" }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-semibold leading-snug line-clamp-2"
                      style={{ color: "#16130f" }}
                    >
                      {item.listing.title}
                    </p>
                    <p
                      className="font-display text-[16px] font-bold mt-1"
                      style={{ color: "#3730a3" }}
                    >
                      ₦{item.listing.price.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item)}
                    aria-label={`Remove ${item.listing.title}`}
                    className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 self-start mt-0.5"
                    style={{ color: "#c4bdb6" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "#fef2f2";
                      (e.currentTarget as HTMLElement).style.color = "#ef4444";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "#c4bdb6";
                    }}
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && items.length > 0 && (
          <div
            className="px-5 pb-6 pt-4 shrink-0"
            style={{
              background: "#ffffff",
              boxShadow: "0 -1px 0 #e8e4dc, 0 -8px 24px rgba(22,19,15,0.04)",
            }}
          >
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-[13px] font-medium" style={{ color: "#78726c" }}>
                Total · {items.length} {items.length === 1 ? "item" : "items"}
              </span>
              <span className="font-display text-[22px] font-bold" style={{ color: "#16130f" }}>
                ₦{items.reduce((sum, i) => sum + i.listing.price, 0).toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => handleNavigate("/cart")}
              className="w-full h-12 rounded-2xl text-[14px] font-bold text-white transition-all duration-200"
              style={{
                background: "#3730a3",
                boxShadow: "0 2px 8px rgba(55,48,163,0.35)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#312e81";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 5px 16px rgba(55,48,163,0.45)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#3730a3";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(55,48,163,0.35)";
              }}
            >
              Checkout
            </button>
          </div>
        )}
    </ResponsiveDrawer>
  );
}
