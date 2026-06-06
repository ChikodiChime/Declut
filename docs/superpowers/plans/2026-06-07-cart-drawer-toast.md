# Cart Drawer & Add-to-Cart Toast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a toast when an item is added to cart, and open a slide-in cart drawer when the navbar cart icon is clicked.

**Architecture:** Three isolated changes — a one-line toast in BrowseCard, a new self-contained CartDrawer component, and wiring CartDrawer into NavbarWrapper by converting CartButton from a Link to a button. No shared state beyond what already exists in React Query's cart cache.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, sonner (toasts), @tanstack/react-query (cart cache), lucide-react (icons)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `components/listings/BrowseCard.tsx` | Modify | Add sonner toast after successful add-to-cart |
| `components/layout/CartDrawer.tsx` | Create | Slide-in drawer: fetch items, remove, footer nav |
| `components/layout/NavbarWrapper.tsx` | Modify | Add drawer state, convert CartButton, render CartDrawer |

---

### Task 1: Add-to-cart toast in BrowseCard

**Files:**
- Modify: `components/listings/BrowseCard.tsx` (around line 120)

- [ ] **Step 1: Add the toast call after cart success**

In `components/listings/BrowseCard.tsx`, find `handleAddToCart`. After `setCartState("done")` (line ~121), add the toast. The `toast` import already exists (`import { toast } from "sonner"`), and `router` is already available.

Change this section:

```tsx
    setCartState("done");
    setTimeout(() => setCartState("idle"), 2000);
```

To:

```tsx
    setCartState("done");
    toast.success(`${listing.title} added to cart`, {
      action: { label: "View cart", onClick: () => router.push("/cart") },
    });
    setTimeout(() => setCartState("idle"), 2000);
```

- [ ] **Step 2: Verify manually**

Start the dev server (`npm run dev`), open any listing browse page, add a for-sale item to cart. Confirm:
- A toast appears bottom-right with the item title and a "View cart" button
- Clicking "View cart" navigates to `/cart`
- The existing cart icon badge still increments

- [ ] **Step 3: Commit**

```bash
git add components/listings/BrowseCard.tsx
git commit -m "feat: show toast when item added to cart"
```

---

### Task 2: Create CartDrawer component

**Files:**
- Create: `components/layout/CartDrawer.tsx`

This component is fully self-contained. It receives `open` and `onClose` props, fetches its own cart data when opened, and handles remove internally.

- [ ] **Step 1: Create the file**

Create `components/layout/CartDrawer.tsx` with the full content below:

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, ShoppingCart } from "lucide-react";
import { ListingImage } from "@/components/ui";
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
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    async function load() {
      if (user) {
        const res = await fetch("/api/cart");
        const data = await res.json();
        setItems(data.data ?? []);
      } else {
        const sessionCart = getSessionCart();
        if (sessionCart.length === 0) {
          setItems([]);
        } else {
          const listingIds = sessionCart.map((i) => i.listing_id).join(",");
          const res = await fetch(`/api/cart?listing_ids=${listingIds}`);
          const data = await res.json();
          setItems(data.data ?? []);
        }
      }
      setLoading(false);
    }

    load();
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function removeItem(item: CartItemWithListing) {
    if (user) {
      await fetch(`/api/cart/${item.id}`, { method: "DELETE" });
    } else {
      removeFromSessionCart(item.id);
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    queryClient.setQueryData<string[]>(CART_QUERY_KEY, (prev = []) =>
      prev.filter((id) => id !== item.listing_id),
    );
  }

  function handleNavigate(path: string) {
    onClose();
    router.push(path);
  }

  return (
    <>
      {/* Overlay */}
      <div
        aria-hidden
        className="fixed inset-0 z-50"
        style={{
          background: "rgba(22,19,15,0.5)",
          backdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 250ms ease",
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col w-full max-w-sm"
        style={{
          background: "#ffffff",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "-4px 0 32px rgba(22,19,15,0.12)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid #f0ece5" }}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} strokeWidth={2} style={{ color: "#56524d" }} />
            <span
              className="text-[15px] font-semibold"
              style={{ color: "#16130f" }}
            >
              Cart
            </span>
            {items.length > 0 && (
              <span
                className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: "#f0ece5", color: "#78726c" }}
              >
                {items.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
            style={{ color: "#56524d" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "#f0ece5")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "transparent")
            }
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-border shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-border rounded w-3/4" />
                    <div className="h-3 bg-border rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <ShoppingCart
                size={32}
                strokeWidth={1.2}
                style={{ color: "#d1cdc7" }}
                className="mb-3"
              />
              <p
                className="text-[15px] font-medium"
                style={{ color: "#16130f" }}
              >
                Your cart is empty
              </p>
              <p className="text-sm mt-1 mb-6" style={{ color: "#a8a09a" }}>
                Browse listings and add items to get started
              </p>
              <button
                onClick={() => handleNavigate("/")}
                className="text-sm font-medium px-5 py-2.5 rounded-full transition-colors"
                style={{ border: "1px solid #e8e4dc", color: "#16130f" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "#f8f5f0")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "transparent")
                }
              >
                Browse listings
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl p-2.5"
                  style={{ border: "1px solid #f0ece5" }}
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-border">
                    {item.listing.images?.[0] && (
                      <ListingImage
                        src={item.listing.images[0]}
                        alt={item.listing.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-medium truncate"
                      style={{ color: "#16130f" }}
                    >
                      {item.listing.title}
                    </p>
                    <p
                      className="text-[13px] font-bold mt-0.5"
                      style={{ color: "#4f46e5" }}
                    >
                      ₦{item.listing.price.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item)}
                    aria-label={`Remove ${item.listing.title}`}
                    className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
                    style={{ color: "#a8a09a" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "#fff0f0";
                      (e.currentTarget as HTMLElement).style.color = "#e53e3e";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                      (e.currentTarget as HTMLElement).style.color = "#a8a09a";
                    }}
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && items.length > 0 && (
          <div
            className="px-5 py-4 flex items-center gap-3 shrink-0"
            style={{ borderTop: "1px solid #f0ece5" }}
          >
            <button
              onClick={() => handleNavigate("/cart")}
              className="flex-1 h-11 rounded-full text-[14px] font-medium transition-colors"
              style={{ border: "1px solid #e8e4dc", color: "#16130f" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#f8f5f0")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "transparent")
              }
            >
              View cart
            </button>
            <button
              onClick={() => handleNavigate("/cart")}
              className="flex-1 h-11 rounded-full text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "#4f46e5" }}
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors for the new file. Fix any type errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add components/layout/CartDrawer.tsx
git commit -m "feat: add CartDrawer component"
```

---

### Task 3: Wire CartDrawer into NavbarWrapper

**Files:**
- Modify: `components/layout/NavbarWrapper.tsx`

Two changes in this file: (1) add `cartDrawerOpen` state to `NavbarContent` and render `CartDrawer`, (2) update `CartButton` to accept an `onOpen` prop and become a button instead of a Link.

- [ ] **Step 1: Import CartDrawer**

At the top of `components/layout/NavbarWrapper.tsx`, add the import after the existing local imports:

```tsx
import { CartDrawer } from "@/components/layout/CartDrawer";
```

- [ ] **Step 2: Add cartDrawerOpen state to NavbarContent**

Inside `NavbarContent`, find the two existing state declarations:

```tsx
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
```

Add a third:

```tsx
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
```

- [ ] **Step 3: Render CartDrawer inside the fragment**

At the very end of the `NavbarContent` return, just before the closing `</>`, add:

```tsx
      <CartDrawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
      />
```

- [ ] **Step 4: Update CartButton to accept onOpen and become a button**

Find the `CartButton` component at the bottom of the file (around line 770). It currently renders a `<Link href="/cart" ...>`. Replace the entire component with:

```tsx
function CartButton({
  transparent,
  onOpen,
}: {
  transparent: boolean;
  onOpen: () => void;
}) {
  const { count, loading } = useCart();
  const [hover, setHover] = useState(false);

  if (loading) return null;

  const baseBg = transparent
    ? "rgba(255,255,255,0.10)"
    : "rgba(22,19,15,0.045)";
  const hoverBg = transparent
    ? "rgba(255,255,255,0.18)"
    : "rgba(22,19,15,0.08)";
  const iconColor = transparent ? "rgba(255,255,255,0.92)" : "#16130f";

  return (
    <button
      onClick={onOpen}
      aria-label={`Cart (${count} items)`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative inline-flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200"
      style={{
        background: hover ? hoverBg : baseBg,
        boxShadow: transparent
          ? "inset 0 0 0 1px rgba(255,255,255,0.14)"
          : "inset 0 0 0 1px rgba(22,19,15,0.06)",
      }}
    >
      <ShoppingCart size={16} strokeWidth={2} style={{ color: iconColor }} />
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white"
          style={{
            background: "#4f46e5",
            boxShadow: "0 0 0 2px var(--cart-ring)",
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 5: Pass onOpen to CartButton in NavbarContent**

Find the usage of `CartButton` in the `NavbarContent` JSX (around line 466):

```tsx
            <CartButton transparent={transparent} />
```

Replace with:

```tsx
            <CartButton
              transparent={transparent}
              onOpen={() => setCartDrawerOpen(true)}
            />
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any before continuing.

- [ ] **Step 7: Manual verification**

Start the dev server (`npm run dev`) and verify:
1. Clicking the cart icon in the navbar opens the drawer from the right
2. The overlay dims the background; clicking it closes the drawer
3. Pressing Escape closes the drawer
4. Items show with thumbnail, title, price, and X remove button
5. Clicking X on an item removes it from the drawer and decrements the navbar badge
6. "View cart" and "Checkout" both navigate to `/cart` and close the drawer
7. Empty state shows when cart is empty
8. Loading skeletons show briefly while fetching

- [ ] **Step 8: Commit**

```bash
git add components/layout/NavbarWrapper.tsx
git commit -m "feat: open cart drawer from navbar cart icon"
```
