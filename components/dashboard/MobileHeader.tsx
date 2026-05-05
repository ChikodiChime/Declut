"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, LayoutDashboard, Package, PlusCircle,
  LogOut, ShoppingCart, CreditCard,
} from "lucide-react";
import { useSignOut } from "@/lib/hooks/useAuth";

const NAV_ITEMS = [
  { href: "/dashboard",              label: "Overview",    icon: LayoutDashboard },
  { href: "/dashboard/listings",     label: "My Listings", icon: Package         },
  { href: "/dashboard/listings/new", label: "New Listing", icon: PlusCircle      },
  { href: "/dashboard/orders",       label: "Orders",      icon: ShoppingCart,   disabled: true },
  { href: "/dashboard/payouts",      label: "Payouts",     icon: CreditCard,     disabled: true },
];

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { mutate: signOut } = useSignOut();

  return (
    <>
      {/* Mobile top bar — hidden on lg (TopBar handles that) */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-primary shrink-0">
        <Link href="/dashboard">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.svg" alt="declut" className="h-7 " />
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="p-2 rounded-lg text-white/80 hover:bg-white/15 transition-colors"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/30 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.nav
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="lg:hidden fixed inset-y-0 left-0 w-64 bg-primary z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-light.svg" alt="declut" className="h-7 " />
                <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-1.5 rounded-lg text-white/60 hover:bg-white/10">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 flex flex-col px-3 py-3 gap-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                  if (item.disabled) {
                    return (
                      <div key={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/30 cursor-not-allowed">
                        <Icon size={18} strokeWidth={1.75} />
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/10 text-white/40">Soon</span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={[
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        isActive
                          ? "bg-white/15 text-white"
                          : "text-white/65 hover:bg-white/10 hover:text-white",
                      ].join(" ")}
                    >
                      <Icon size={18} strokeWidth={isActive ? 2 : 1.75} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="px-3 pb-5 border-t border-white/15 pt-3">
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-white/90 transition-colors"
                >
                  <LogOut size={17} strokeWidth={1.75} />
                  <span className="text-sm font-medium">Sign out</span>
                </button>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
