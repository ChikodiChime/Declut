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
  ChevronRight,
  Store,
} from "lucide-react";
import { CldImage } from "next-cloudinary";
import { useMe, useSignOut } from "@/lib/hooks/useAuth";

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
  const { data: me } = useMe();
  const { mutate: signOut } = useSignOut();

  return (
    <aside className="hidden lg:flex flex-col w-(--sidebar-width) h-screen top-0 bg-primary shrink-0 rounded-r-4xl relative overflow-hidden">
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
      <nav className="relative z-10 flex-1 flex flex-col px-3 py-2 gap-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
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
            <Link key={item.href} href={item.href}>
              <div
                className={[
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150",
                  isActive
                    ? "text-white"
                    : "text-white/55 hover:text-white/85 hover:bg-white/5",
                ].join(" ")}
              >
                {/* Active background */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}

                {/* Left accent bar */}
                {isActive && (
                  <motion.span
                    layoutId="sidebar-accent"
                    className="absolute left-0 top-2 bottom-2 w-[3px] bg-white rounded-r-full"
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
                {isActive && (
                  <ChevronRight size={14} className="relative z-10 text-white/50" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Profile + Sign out */}
      <div className="relative z-10 px-3 pb-5 shrink-0">
        <div className="h-px bg-white/10 mb-3" />

        <Link href="/dashboard/profile">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors duration-150 cursor-pointer group mb-1">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-white/20">
              {me?.avatar_url ? (
                <CldImage
                  src={me.avatar_url}
                  width={32}
                  height={32}
                  alt={me.name ?? "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">
                    {me?.name?.[0]?.toUpperCase() ?? "U"}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{me?.name ?? "Account"}</p>
              <p className="text-[11px] text-white/50 truncate">{me?.email ?? ""}</p>
            </div>
          </div>
        </Link>

        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-white/50 hover:bg-white/5 hover:text-white/80 transition-colors duration-150"
        >
          <LogOut size={17} strokeWidth={1.75} />
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
