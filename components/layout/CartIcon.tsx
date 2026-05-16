"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { getSessionCart } from "@/lib/session-cart";

export function CartIcon({ transparent = false }: { transparent?: boolean }) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCartCount() {
      try {
        const res = await fetch("/api/cart");
        if (res.ok) {
          const data = await res.json();
          setCount(data.data?.length ?? 0);
        } else if (res.status === 401) {
          const sessionCart = getSessionCart();
          setCount(sessionCart.length);
        }
      } catch (error) {
        console.error("Failed to fetch cart count:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCartCount();

    const handleCartUpdate = () => {
      fetchCartCount();
    };

    window.addEventListener("cart-updated", handleCartUpdate);
    return () => window.removeEventListener("cart-updated", handleCartUpdate);
  }, []);

  if (loading) {
    return null;
  }

  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center justify-center transition-opacity hover:opacity-70"
      aria-label={`Cart (${count} items)`}
    >
      <ShoppingCart
        size={20}
        strokeWidth={1.75}
        style={{
          color: transparent ? "rgba(255,255,255,0.82)" : "#78726c",
        }}
        className="transition-colors duration-300"
      />
      {count > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white"
          style={{ background: "#4f46e5" }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
