"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  LogOut,
  ShoppingCart,
  CreditCard,
  Store,
  X,
  Search,
  User,
  BookMarked,
  MessageCircle,
} from "lucide-react";

function PanelIcon({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2 13.5a.5.5 0 0 0 1 0v-11a.5.5 0 0 0-1 0zm12-9A2.5 2.5 0 0 0 11.5 2h-5a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h5a2.5 2.5 0 0 0 2.5-2.5zM7 13v-2h3v2zm0-3V6h3v4zm0-5V3h3v2zm6 1v4h-2V6zm0 5v.5a1.5 1.5 0 0 1-1.5 1.5H11v-2zm0-6h-2V3h.5A1.5 1.5 0 0 1 13 4.5z" fill="currentColor" />
    </svg>
  );
}
import { CldImage } from "next-cloudinary";
import { useMe, useSignOut } from "@/lib/hooks/useAuth";
import { NotificationBell } from "@/components/dashboard/TopBar";
import { SearchModal } from "@/components/dashboard/SearchModal";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  disabled?: boolean;
}

interface SidebarProps {
  navItems?: NavItem[];
  logoHref?: string;
  sectionLabel?: string;
  profileHref?: string;
  layoutIdPrefix?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/listings", label: "My Listings", icon: Package },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/billing", label: "Payouts", icon: CreditCard },
  { href: "/dashboard/address-book", label: "Address Book", icon: BookMarked },
  { href: "/chat", label: "Chat with AI", icon: MessageCircle },
  { href: "/", label: "Browse Listings", icon: Store },
];

const GRID_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Cpath d='M36 0H0V36' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='1'/%3E%3C/svg%3E\")";

function isActive(pathname: string, href: string, logoHref: string) {
  return href === "/" || href === logoHref
    ? pathname === href
    : pathname.startsWith(href);
}

function DesktopNavItems({
  pathname,
  navItems,
  logoHref,
  layoutIdPrefix,
}: {
  pathname: string;
  navItems: NavItem[];
  logoHref: string;
  layoutIdPrefix: string;
}) {
  const { mutate: signOut } = useSignOut();

  return (
    <>
      <nav className="relative z-10 flex-1 flex flex-col px-3 py-2 gap-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, logoHref);

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
                  active ? "text-primary" : "text-white",
                ].join(" ")}
              >
                {!active && (
                  <span
                    className="absolute inset-y-0 left-0 rounded-l-lg bg-white/0 group-hover:bg-white/10 transition-colors duration-150"
                    style={{ right: -12 }}
                  />
                )}
                {active && (
                  <motion.div
                    layoutId={`${layoutIdPrefix}-active-bg`}
                    className="absolute inset-y-0 left-0 bg-white rounded-l-lg"
                    style={{ right: -12 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                {active && (
                  <motion.span
                    layoutId={`${layoutIdPrefix}-accent`}
                    className="absolute top-2 bottom-2 w-[3px] bg-white rounded-r-full"
                    style={{ left: -12 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon size={18} strokeWidth={active ? 2 : 1.75} className="relative z-10 shrink-0" />
                <span className="relative z-10 text-sm font-medium flex-1">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

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
    </>
  );
}

function DrawerProfile({ onNavigate, profileHref }: { onNavigate: () => void; profileHref: string }) {
  const { data: me } = useMe();
  const { mutate: signOut } = useSignOut();

  return (
    <div className="px-4 py-4 border-t border-white/15">
      <div className="flex items-center gap-3">
        <div
          className="shrink-0 overflow-hidden ring-1 ring-white/20"
          style={{ width: 40, height: 40, borderRadius: 99 }}
        >
          {me?.avatar_url ? (
            <CldImage
              src={me.avatar_url}
              width={40}
              height={40}
              alt={me?.name ?? "Avatar"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-white/15 flex items-center justify-center">
              <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
                {me?.name?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {me?.name ?? "Account"}
          </p>
          <p className="truncate text-xs text-white/55">{me?.email ?? ""}</p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Link
          href={profileHref}
          onClick={onNavigate}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-white/80 hover:text-white"
        >
          <User size={13} strokeWidth={1.75} />
          <span className="text-xs font-medium">Profile</span>
        </Link>
        <button
          onClick={() => signOut()}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 transition-colors text-red-300 hover:text-red-200"
        >
          <LogOut size={13} strokeWidth={1.75} />
          <span className="text-xs font-medium">Sign out</span>
        </button>
      </div>
    </div>
  );
}

function MobileDrawerNavItems({
  pathname,
  onNavigate,
  navItems,
  logoHref,
}: {
  pathname: string;
  onNavigate: () => void;
  navItems: NavItem[];
  logoHref: string;
}) {
  return (
    <div className="flex-1 flex flex-col px-3 py-3 gap-1 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href, logoHref);

        if (item.disabled) {
          return (
            <div
              key={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/30 cursor-not-allowed select-none"
            >
              <Icon size={18} strokeWidth={1.75} />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/10 text-white/40">
                  {item.badge}
                </span>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={[
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
              active
                ? "bg-white/15 text-white"
                : "text-white/65 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <Icon size={18} strokeWidth={active ? 2 : 1.75} />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}


export function Sidebar({
  navItems = NAV_ITEMS,
  logoHref = "/dashboard",
  sectionLabel,
  profileHref = "/dashboard/profile",
  layoutIdPrefix = "sidebar",
}: SidebarProps = {}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-(--sidebar-width) h-screen top-0 bg-primary shrink-0 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: GRID_PATTERN, backgroundSize: "36px 36px" }}
        />
        <div className="relative z-10 px-6 py-5 shrink-0">
          <Link href={logoHref}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-light.svg" alt="declut" className="h-7" />
          </Link>
        </div>
        {sectionLabel && (
          <div className="relative z-10 px-6 pb-3 shrink-0">
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">
              {sectionLabel}
            </span>
          </div>
        )}
        <DesktopNavItems pathname={pathname} navItems={navItems} logoHref={logoHref} layoutIdPrefix={layoutIdPrefix} />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden flex items-center gap-1 px-4 py-3 bg-primary shrink-0">
        <Link href={logoHref} className="mr-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.svg" alt="declut" className="h-7" />
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="flex items-center justify-center text-white/80 hover:bg-white/15 transition-colors"
            style={{ width: 36, height: 36, borderRadius: 10 }}
          >
            <Search size={17} strokeWidth={1.75} />
          </button>
          <NotificationBell triggerClassName="text-white/80 hover:text-white hover:bg-white/15" />
        </div>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="p-2 rounded-lg text-white/80 hover:bg-white/15 transition-colors"
        >
          {mobileOpen ? <X size={20} /> : <PanelIcon size={20} />}
        </button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/30 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="lg:hidden fixed inset-y-0 left-0 w-64 bg-primary z-50 flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-light.svg" alt="declut" className="h-7" />
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="p-1.5 rounded-lg text-white/60 hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Nav links */}
              <MobileDrawerNavItems
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
                navItems={navItems}
                logoHref={logoHref}
              />

              {/* Profile section */}
              <DrawerProfile onNavigate={() => setMobileOpen(false)} profileHref={profileHref} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
