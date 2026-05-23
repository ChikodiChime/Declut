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
} from "lucide-react";
import { useSignOut, useMe } from "@/lib/hooks/useAuth";

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
];

export function Sidebar() {
  const pathname = usePathname();
  const { mutate: signOut } = useSignOut();
  const { data: me } = useMe();
  const initial = me?.name?.[0]?.toUpperCase() ?? "U";

  return (
    <aside className="hidden lg:flex flex-col w-(--sidebar-width) h-screen  top-0 bg-primary shrink-0 rounded-r-4xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-white/3" />
      </div>

      {/* Logo */}
      <div className="relative z-10 px-6 py-5 shrink-0">
        <Link href="/dashboard">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.svg" alt="declut" className="h-7" />
        </Link>
      </div>

      {/* Nav — scrollable */}
      <nav className="relative z-10 flex-1 flex flex-col px-3 py-2 gap-1 overflow-y-auto">
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-white/30 cursor-not-allowed select-none"
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
              <motion.div
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 relative overflow-hidden group",
                  isActive ? "text-white" : "text-white/60",
                ].join(" ")}
              >
                {/* Animated gradient background for active state */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-transparent rounded-lg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}

                {/* Hover glow effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={false}
                />

                {/* Sliding accent bar on hover */}
                <motion.div
                  className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-white/60 via-white/40 to-white/60 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={false}
                />

                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  className={[
                    "relative z-10 transition-all duration-300",
                    isActive
                      ? "text-white scale-110"
                      : "group-hover:scale-110 group-hover:text-white/90",
                  ].join(" ")}
                />
                <span className="relative z-10 text-sm font-medium flex-1 transition-all duration-300 group-hover:tracking-wide">
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <ChevronRight
                      size={14}
                      className="relative z-10 text-white/70"
                    />
                  </motion.div>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="relative z-10 px-6 py-2 shrink-0">
        <div className="h-px bg-white/10" />
      </div>

      {/* User profile */}
      <div className="relative z-10 px-3 pb-3 shrink-0">
        <Link href="/dashboard/profile">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 px-3 py-3 rounded-lg bg-white/10 hover:bg-white/15 transition-colors duration-150 cursor-pointer group border border-white/5"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-white/25 to-white/10 flex items-center justify-center shrink-0 group-hover:from-white/30 group-hover:to-white/15 transition-colors duration-150 ring-2 ring-white/10">
              <span className="text-base font-bold text-white">{initial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {me?.name ?? "User"}
              </p>
              <p className="text-xs text-white/50 truncate font-medium">
                My Profile
              </p>
            </div>
            <ChevronRight
              size={16}
              className="text-white/40 group-hover:text-white/70 transition-colors duration-150"
            />
          </motion.div>
        </Link>
      </div>

      {/* Sign out */}
      <div className="relative z-10 px-3 pb-5 shrink-0">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-white/90 transition-colors duration-150"
        >
          <LogOut size={17} strokeWidth={1.75} />
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
