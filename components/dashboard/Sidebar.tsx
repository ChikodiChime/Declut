"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  LogOut,
  ShoppingCart,
  CreditCard,
  Store,
} from "lucide-react";
import { useSignOut } from "@/lib/hooks/useAuth";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/listings", label: "My Listings", icon: Package },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/billing", label: "Payouts", icon: CreditCard },
  { href: "/", label: "Browse Listings", icon: Store },
];

export function Sidebar() {
  const pathname = usePathname();
  const { mutate: signOut } = useSignOut();

  return (
    <aside className="hidden lg:flex flex-col w-(--sidebar-width) h-screen top-0 bg-primary shrink-0 relative overflow-hidden">
      {/* Grid pattern */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M36 0H0V36' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='1'/%3E%3C/svg%3E\")",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Logo */}
      <div className="relative z-10 px-6 py-5 shrink-0">
        <Link href="/dashboard">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.svg" alt="declut" className="h-7" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 flex flex-col px-3 py-2 gap-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" || item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/30 cursor-not-allowed select-none"
              >
                <Icon size={18} strokeWidth={1.75} />
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/10 text-white/40">
                    {item.badge}
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link key={item.href} href={item.href} className="group block">
              <div
                className={[
                  "relative flex items-center gap-3 px-3 py-2.5 transition-colors duration-150",
                  isActive ? "text-primary" : "text-white",
                ].join(" ")}
              >
                {/* Hover pill for inactive items — same shape, subtle fill */}
                {!isActive && (
                  <span
                    className="absolute inset-y-0 left-0 rounded-l-lg bg-white/0 group-hover:bg-white/10 transition-colors duration-150"
                    style={{ right: -12 }}
                  />
                )}

                {/* Active pill — solid white, bleeds to right edge */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-y-0 left-0 bg-white rounded-l-lg"
                    style={{ right: -12 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}

                {/* Active left accent bar — sits on the sidebar bg to the left of the pill */}
                {isActive && (
                  <motion.span
                    layoutId="sidebar-accent"
                    className="absolute top-2 bottom-2 w-[3px] bg-white rounded-r-full"
                    style={{ left: -12 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}

                <Icon
                  size={18}
                  strokeWidth={isActive ? 2 : 1.75}
                  className="relative z-10 shrink-0"
                />
                <span className="relative z-10 text-sm font-medium flex-1">
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="relative z-10 px-3 pb-5 shrink-0">
        <div className="h-px bg-white/10 mb-3" />
        <button
          onClick={() => signOut()}
          className="group relative flex items-center gap-3 w-full px-3 py-2.5 text-red-300 hover:text-red-200 transition-colors duration-150"
        >
          <span
            className="absolute inset-y-0 left-0 rounded-l-lg bg-red-500/0 group-hover:bg-red-500/20 transition-colors duration-150"
            style={{ right: -12 }}
          />
          <LogOut size={17} strokeWidth={1.75} className="relative z-10" />
          <span className="relative z-10 text-sm font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
