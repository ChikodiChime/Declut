"use client";

import Link from "next/link";
import { CartIcon as CartSvgIcon } from "@/components/icons/CartIcon";
import { useCart } from "@/lib/hooks/useCart";

export function CartIcon({ transparent = false }: { transparent?: boolean }) {
  const { count, loading } = useCart();

  if (loading) return null;

  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center justify-center transition-opacity hover:opacity-70"
      aria-label={`Cart (${count} items)`}
    >
      <CartSvgIcon
        size={22}
        color={transparent ? "rgba(255,255,255,0.82)" : "#78726c"}
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
