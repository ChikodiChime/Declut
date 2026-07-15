"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import { CldImage } from "next-cloudinary";
import {
  type FluentIcon,
  bundleIcon,
  SearchSquareFilled,
  SearchSquareRegular,
  TagQuestionMarkFilled,
  TagQuestionMarkRegular,
  GroupFilled,
  GroupRegular,
  ShoppingBagFilled,
  ShoppingBagRegular,
  SignOutRegular,
  CollectionsAddFilled,
  CollectionsAddRegular,
  ChevronRightRegular,
  DismissRegular,
  SearchRegular,
  AddRegular,
  LineHorizontal3Regular,
} from "@fluentui/react-icons";
import { useMe, useSignOut } from "@/lib/hooks/useAuth";
import { useOrdersModal } from "@/lib/context/orders-modal-context";
import { useCart } from "@/lib/hooks/useCart";
import { NavbarSearch } from "@/components/layout/NavbarSearch";
import { CartDrawer } from "@/components/layout/CartDrawer";

const HIDDEN_PREFIXES = [
  "/dashboard",
  "/auth",
  "/login",
  "/dispatch",
  "/verify-email",
  "/admin",
  "/chat",
];

// Regular (outline) for the default state, Filled for the active route —
// bundleIcon swaps between them via the `filled` prop.
const BrowseIcon = bundleIcon(SearchSquareFilled, SearchSquareRegular);
const RequestsIcon = bundleIcon(TagQuestionMarkFilled, TagQuestionMarkRegular);
const ListItemIcon = bundleIcon(CollectionsAddFilled, CollectionsAddRegular);
const DashboardMenuIcon = bundleIcon(GroupFilled, GroupRegular);
const PurchasesIcon = bundleIcon(ShoppingBagFilled, ShoppingBagRegular);

const SCROLL_THRESHOLD = 16;
const SEARCH_THRESHOLD = 350;

// Resolves the real scroll position before first paint so a refresh on an
// already-scrolled page doesn't flash the top-of-page (transparent) navbar
// before correcting — useLayoutEffect is a no-op during SSR, so fall back
// to useEffect there.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

function ProfileMenu({
  name,
  avatarUrl,
  transparent,
}: {
  name: string | null;
  avatarUrl?: string | null;
  transparent: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { mutate: signOut } = useSignOut();
  const { openList } = useOrdersModal();

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const ringStyle = transparent
    ? {
        boxShadow: open
          ? "0 0 0 2px rgba(255,255,255,0.45)"
          : "inset 0 0 0 1px rgba(255,255,255,0.22)",
      }
    : {
        boxShadow: open
          ? "0 0 0 3px rgba(22,19,15,0.12)"
          : "0 1px 2px rgba(22,19,15,0.12)",
      };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="group focus:outline-none"
      >
        {avatarUrl ? (
          <span
            className="w-9 h-9 rounded-full overflow-hidden block select-none transition-all duration-200"
            style={ringStyle}
          >
            <CldImage
              src={avatarUrl}
              width={36}
              height={36}
              alt={name ?? "Avatar"}
              className="w-full h-full object-cover"
            />
          </span>
        ) : (
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center text-[11.5px] font-semibold tracking-wide select-none transition-all duration-200"
            style={
              transparent
                ? {
                    background: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.95)",
                    backdropFilter: "blur(10px)",
                    ...ringStyle,
                  }
                : {
                    background: "#16130f",
                    color: "white",
                    ...ringStyle,
                  }
            }
          >
            {getInitials(name)}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2.5 w-56 rounded-xl overflow-hidden z-50"
          style={{
            background: "#ffffff",
            border: "1px solid #ede9e2",
            boxShadow:
              "0 4px 6px rgba(22,19,15,0.04), 0 16px 40px rgba(22,19,15,0.11)",
          }}
        >
          {name && (
            <div
              className="px-4 py-3"
              style={{ borderBottom: "1px solid #f0ece5" }}
            >
              <p
                className="text-[11px] font-medium mb-0.5"
                style={{ color: "#a8a09a" }}
              >
                Signed in as
              </p>
              <p
                className="text-sm font-semibold truncate"
                style={{ color: "#16130f" }}
              >
                {name}
              </p>
            </div>
          )}
          <div className="py-1">
            <MenuLink
              href="/dashboard"
              icon={GroupRegular}
              onClick={() => setOpen(false)}
            >
              Dashboard
            </MenuLink>
            <button
              onClick={() => {
                setOpen(false);
                openList();
              }}
              className="flex items-center gap-3 px-4 py-2 text-[13px] font-medium transition-colors w-full text-left"
              style={{ color: "#16130f" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f8f5f0")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <ShoppingBagRegular fontSize={15} style={{ color: "#a8a09a" }} />
              My purchases
            </button>
          </div>
          <div style={{ borderTop: "1px solid #f0ece5" }} className="py-1">
            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium transition-colors text-left"
              style={{ color: "#e53e3e" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#fff5f5")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <SignOutRegular fontSize={15} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  onClick,
  children,
}: {
  href: string;
  icon: FluentIcon;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2 text-[13px] font-medium transition-colors"
      style={{ color: "#16130f" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8f5f0")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon fontSize={15} style={{ color: "#a8a09a" }} />
      {children}
    </Link>
  );
}

// Desktop top-bar link (Browse/Requests) — a short accent-colored underline
// draws in on hover and stays drawn while the route is active.
function NavTab({
  href,
  active,
  transparent,
  linkColor,
  linkHover,
  children,
}: {
  href: string;
  active: boolean;
  transparent: boolean;
  linkColor: string;
  linkHover: string;
  children: React.ReactNode;
}) {
  const accent = transparent ? "#a5b4fc" : "#4f46e5";

  return (
    <Link
      href={href}
      className="group relative text-[15px] font-medium px-3.5 py-2 transition-colors duration-200"
      style={{ color: active ? linkHover : linkColor }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.color = linkHover;
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.color = linkColor;
      }}
    >
      {children}
      <span
        aria-hidden
        className={`absolute left-1/2 bottom-0.5 h-[2px] w-5 -translate-x-1/2 rounded-full transition-transform duration-300 ease-out ${
          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
        }`}
        style={{ background: accent }}
      />
    </Link>
  );
}

// Mobile bottom-sheet nav row. Active state stacks three cues, not just the
// icon fill: a tinted row background, a left accent bar, and bold indigo text.
function MobileNavRow({
  href,
  icon: Icon,
  active,
  prefetch,
  onClick,
  children,
}: {
  href: string;
  icon: FluentIcon;
  active: boolean;
  prefetch?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      onClick={onClick}
      className={`relative flex items-center gap-3 pl-4 pr-3 py-2 rounded-xl text-[15px] transition-colors ${
        active ? "font-semibold bg-[#f5f3ff]" : "font-medium hover:bg-[#f8f5f0]"
      }`}
      style={{ color: active ? "#4f46e5" : "#16130f" }}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full"
          style={{ background: "#4f46e5" }}
        />
      )}
      <span
        className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-colors duration-200"
        style={{
          background: active ? "#4f46e5" : "#f0eefc",
          color: active ? "#ffffff" : "#4f46e5",
          boxShadow: active ? "0 4px 10px -2px rgba(79,70,229,0.45)" : "none",
        }}
      >
        <Icon filled={active} fontSize={20} />
      </span>
      {children}
    </Link>
  );
}

function MobileNavButton({
  icon: Icon,
  onClick,
  children,
}: {
  icon: FluentIcon;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 pl-4 pr-3 py-2 rounded-xl text-[15px] font-medium text-left w-full transition-colors hover:bg-[#f8f5f0]"
      style={{ color: "#16130f" }}
    >
      <span
        className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
        style={{ background: "#f0eefc", color: "#4f46e5" }}
      >
        <Icon fontSize={20} />
      </span>
      {children}
    </button>
  );
}

// Wraps an icon-only trigger with a small dark label that fades in on
// hover/focus — for buttons whose meaning isn't spelled out in visible text.
function Tooltip({
  label,
  align = "center",
  children,
}: {
  label: string;
  align?: "center" | "right";
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline-flex h-full group/tip">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute top-full mt-2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium opacity-0 scale-95 transition-all duration-150 group-hover/tip:opacity-100 group-hover/tip:scale-100 group-focus-within/tip:opacity-100 group-focus-within/tip:scale-100 z-50 ${
          align === "center"
            ? "left-1/2 -translate-x-1/2"
            : "right-0"
        }`}
        style={{ background: "#16130f", color: "#ffffff" }}
      >
        {label}
      </span>
    </span>
  );
}

export function NavbarWrapper() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { data: me, isLoading } = useMe();
  const { mutate: signOut } = useSignOut();

  useIsomorphicLayoutEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
      setShowSearch(window.scrollY > SEARCH_THRESHOLD);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const isSearchPage = pathname === "/search";
  const isRequestsPage =
    pathname === "/requests" || pathname.startsWith("/requests/");

  const DARK_HERO_ROUTES = ["/", "/about"];
  const hasDarkHero = DARK_HERO_ROUTES.includes(pathname);
  const transparent = hasDarkHero && !scrolled;

  const linkColor = transparent ? "rgba(255,255,255,0.78)" : "#56524d";
  const linkHover = transparent ? "#ffffff" : "#16130f";

  return (
    <NavbarContent
      key={pathname}
      scrolled={scrolled}
      showSearch={showSearch}
      isSearchPage={isSearchPage}
      isRequestsPage={isRequestsPage}
      transparent={transparent}
      linkColor={linkColor}
      linkHover={linkHover}
      me={me}
      isLoading={isLoading}
      signOut={signOut}
    />
  );
}

function NavbarContent({
  scrolled,
  showSearch,
  isSearchPage,
  isRequestsPage,
  transparent,
  linkColor,
  linkHover,
  me,
  isLoading,
  signOut,
}: {
  scrolled: boolean;
  showSearch: boolean;
  isSearchPage: boolean;
  isRequestsPage: boolean;
  transparent: boolean;
  linkColor: string;
  linkHover: string;
  me: {
    name?: string | null;
    email?: string;
    avatar_url?: string | null;
  } | null;
  isLoading: boolean;
  signOut: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const { openList } = useOrdersModal();

  const closeSearch = () => setSearchOpen(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen || cartDrawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, cartDrawerOpen]);

  useEffect(() => {
    function handleOpenCartDrawer() {
      setCartDrawerOpen(true);
    }
    window.addEventListener("cart-drawer-open", handleOpenCartDrawer);
    return () =>
      window.removeEventListener("cart-drawer-open", handleOpenCartDrawer);
  }, []);

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: transparent ? "transparent" : "#ffffff",
          boxShadow: scrolled ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
          transition: "background 300ms ease, box-shadow 300ms ease",
        }}
      >
        {/* Top-scrim so logo/links are legible over the dark hero photo */}
        {transparent && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.32) 0%, transparent 100%)",
            }}
          />
        )}

        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 md:px-10 h-[76px] flex items-center justify-between gap-3">
          {/* Logo */}
          <Link
            href="/"
            className="relative h-11 shrink-0 block"
            style={{ minWidth: 110 }}
            aria-label="Unstash home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="Unstash"
              className="absolute inset-0 h-full w-auto transition-opacity duration-300"
              style={{ opacity: transparent ? 0 : 1 }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-light.svg"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-auto transition-opacity duration-300"
              style={{ opacity: transparent ? 1 : 0 }}
            />
          </Link>

          {/* Browse + Requests links */}
          <div className="hidden md:flex items-center gap-1 ml-2">
            <NavTab
              href="/search"
              active={isSearchPage}
              transparent={transparent}
              linkColor={linkColor}
              linkHover={linkHover}
            >
              Browse
            </NavTab>
            <NavTab
              href="/requests"
              active={isRequestsPage}
              transparent={transparent}
              linkColor={linkColor}
              linkHover={linkHover}
            >
              Requests
            </NavTab>
          </div>

          {/* Center: search bar slides in on scroll */}
          <div className="hidden md:flex flex-1 justify-center">
            <div
              className="w-full"
              style={{
                maxWidth: 440,
                opacity: showSearch || isSearchPage ? 1 : 0,
                transform:
                  showSearch || isSearchPage
                    ? "translateY(0)"
                    : "translateY(-8px)",
                pointerEvents: showSearch || isSearchPage ? "auto" : "none",
                transition:
                  "opacity 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <NavbarSearch />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Search icon — mobile only */}
            <button
              ref={searchToggleRef}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200"
              style={{
                background: searchOpen
                  ? transparent
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(22,19,15,0.08)"
                  : "transparent",
                color: transparent ? "rgba(255,255,255,0.92)" : "#16130f",
              }}
              onClick={() => {
                setSearchOpen((open) => !open);
                setMobileOpen(false);
              }}
              aria-label={searchOpen ? "Close search" : "Search"}
              aria-expanded={searchOpen}
            >
              {searchOpen ? (
                <DismissRegular fontSize={18} />
              ) : (
                <SearchRegular fontSize={18} />
              )}
            </button>

            <TransactionPill
              transparent={transparent}
              onCartOpen={() => setCartDrawerOpen(true)}
            />

            {/* Sell CTA — guests go to sign up, signed-in users go straight to the listing form */}
            {!isLoading && (
              <Link
                href={me ? "/dashboard/listings/new" : "/auth/signup"}
                prefetch={me ? false : undefined}
                className="hidden md:inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[14px] font-semibold transition-all duration-200"
                style={
                  transparent
                    ? {
                        color: "rgba(255,255,255,0.88)",
                        border: "1px solid rgba(255,255,255,0.30)",
                        background: "rgba(255,255,255,0.08)",
                      }
                    : {
                        color: "#4f46e5",
                        border: "1px solid rgba(79,70,229,0.30)",
                        background: "rgba(79,70,229,0.05)",
                      }
                }
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  if (transparent) {
                    el.style.background = "rgba(255,255,255,0.16)";
                    el.style.borderColor = "rgba(255,255,255,0.55)";
                  } else {
                    el.style.background = "rgba(79,70,229,0.10)";
                    el.style.borderColor = "rgba(79,70,229,0.50)";
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  if (transparent) {
                    el.style.background = "rgba(255,255,255,0.08)";
                    el.style.borderColor = "rgba(255,255,255,0.30)";
                  } else {
                    el.style.background = "rgba(79,70,229,0.05)";
                    el.style.borderColor = "rgba(79,70,229,0.30)";
                  }
                }}
              >
                <AddRegular fontSize={15} />
                Sell
              </Link>
            )}

            {/* Sell CTA skeleton — shown while auth state resolves */}
            {isLoading && (
              <div
                className="hidden md:block relative h-10 w-[84px] rounded-full overflow-hidden"
                style={{
                  background: transparent
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(22,19,15,0.06)",
                }}
              >
                <div className="skeleton-shimmer" />
              </div>
            )}

            {/* Hamburger — mobile only */}
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200"
              style={{
                background: mobileOpen
                  ? transparent
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(22,19,15,0.08)"
                  : "transparent",
                color: transparent ? "rgba(255,255,255,0.92)" : "#16130f",
              }}
              onClick={() => {
                setMobileOpen((v) => !v);
                setSearchOpen(false);
              }}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <DismissRegular fontSize={19} />
              ) : (
                <LineHorizontal3Regular fontSize={19} />
              )}
            </button>

            {!isLoading &&
              (me ? (
                <div className="hidden md:block">
                  <ProfileMenu
                    name={me.name ?? null}
                    avatarUrl={me.avatar_url ?? null}
                    transparent={transparent}
                  />
                </div>
              ) : (
                <Link
                  href="/auth/signup"
                  className="hidden md:inline-flex items-center justify-center h-10 px-5 rounded-full text-[15px] font-semibold transition-all duration-200"
                  style={
                    transparent
                      ? {
                          background: "#ffffff",
                          color: "#3730a3",
                          boxShadow:
                            "0 1px 2px rgba(0,0,0,0.10), 0 4px 12px -4px rgba(0,0,0,0.22)",
                        }
                      : {
                          background: "#4f46e5",
                          color: "#ffffff",
                          boxShadow:
                            "0 1px 2px rgba(79,70,229,0.20), 0 4px 12px -4px rgba(79,70,229,0.45)",
                        }
                  }
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(-1px)";
                    if (!transparent)
                      (e.currentTarget as HTMLElement).style.background =
                        "#4338ca";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(0)";
                    if (!transparent)
                      (e.currentTarget as HTMLElement).style.background =
                        "#4f46e5";
                  }}
                >
                  Sign up
                </Link>
              ))}

            {/* Avatar/sign-up skeleton — shown while auth state resolves */}
            {isLoading && (
              <div
                className="hidden md:block relative w-9 h-9 rounded-full overflow-hidden"
                style={{
                  background: transparent
                    ? "rgba(255,255,255,0.14)"
                    : "rgba(22,19,15,0.08)",
                }}
              >
                <div className="skeleton-shimmer" />
              </div>
            )}
          </div>
        </div>

        {/* Mobile search — overlays page content, does not push layout */}
        <div
          className="md:hidden absolute left-0 right-0 top-full grid transition-[grid-template-rows] duration-300 ease-out"
          style={{
            gridTemplateRows: searchOpen ? "1fr" : "0fr",
            pointerEvents: searchOpen ? "auto" : "none",
          }}
        >
          <div className="overflow-hidden min-h-0">
            <div className="px-4 py-3">
              <NavbarSearch
                onSearch={closeSearch}
                onDismiss={searchOpen ? closeSearch : undefined}
                dismissExceptRefs={[searchToggleRef]}
                autoFocus={searchOpen}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      <div
        className="fixed inset-0 z-40 md:hidden"
        style={{
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? "auto" : "none",
          background: "rgba(22,19,15,0.5)",
          backdropFilter: "blur(4px)",
          transition: "opacity 300ms ease",
        }}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile menu — bottom sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 md:hidden flex flex-col max-h-[82dvh] rounded-t-3xl overflow-hidden"
        style={{
          background: "#ffffff",
          transform: mobileOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: "0 -8px 30px rgba(22,19,15,0.18)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Drag handle + close */}
        <div className="relative flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: "#e8e4dc" }} />
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="absolute right-2.5 top-1 flex items-center justify-center w-8 h-8 rounded-full"
            style={{ color: "#a8a09a" }}
          >
            <DismissRegular fontSize={16} />
          </button>
        </div>

        {/* Profile row */}
        {isLoading ? (
          <div
            className="flex items-center gap-3 px-5 py-3.5 shrink-0"
            style={{ borderBottom: "1px solid #f0ece5" }}
          >
            <div
              className="relative w-11 h-11 rounded-full overflow-hidden shrink-0"
              style={{ background: "#ede9e2" }}
            >
              <div className="skeleton-shimmer" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div
                className="relative h-3.5 w-28 rounded-full overflow-hidden"
                style={{ background: "#ede9e2" }}
              >
                <div className="skeleton-shimmer" />
              </div>
              <div
                className="relative h-3 w-36 rounded-full overflow-hidden"
                style={{ background: "#f5f2ee" }}
              >
                <div className="skeleton-shimmer" />
              </div>
            </div>
          </div>
        ) : me ? (
          <div
            className="flex items-center gap-3 px-5 py-3.5 shrink-0"
            style={{ borderBottom: "1px solid #f0ece5" }}
          >
            {me.avatar_url ? (
              <span className="w-11 h-11 rounded-full overflow-hidden shrink-0 block">
                <CldImage
                  src={me.avatar_url}
                  width={44}
                  height={44}
                  alt={me.name ?? "Avatar"}
                  className="w-full h-full object-cover"
                />
              </span>
            ) : (
              <span
                className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-semibold tracking-wide shrink-0"
                style={{ background: "#16130f", color: "white" }}
              >
                {getInitials(me.name)}
              </span>
            )}
            <div className="flex-1 min-w-0">
              {me.name && (
                <p
                  className="text-[14px] font-semibold truncate"
                  style={{ color: "#16130f" }}
                >
                  {me.name}
                </p>
              )}
              <p className="text-[12px] truncate" style={{ color: "#a8a09a" }}>
                {me.email}
              </p>
            </div>
            <ChevronRightRegular
              fontSize={16}
              style={{ color: "#a8a09a" }}
            />
          </div>
        ) : (
          <div
            className="flex items-center gap-3 px-5 py-3.5 shrink-0"
            style={{ borderBottom: "1px solid #f0ece5" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Unstash" className="h-8 w-auto" />
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 flex flex-col px-3 py-2 overflow-y-auto">
          <p
            className="px-3 pt-2.5 pb-1 text-[10.5px] font-bold uppercase"
            style={{ color: "#a8a09a", letterSpacing: "0.06em" }}
          >
            Menu
          </p>
          <MobileNavRow
            href="/search"
            icon={BrowseIcon}
            active={isSearchPage}
            onClick={() => setMobileOpen(false)}
          >
            Browse
          </MobileNavRow>
          <MobileNavRow
            href="/requests"
            icon={RequestsIcon}
            active={isRequestsPage}
            onClick={() => setMobileOpen(false)}
          >
            Requests
          </MobileNavRow>
          <MobileNavRow
            href="/dashboard/listings/new"
            icon={ListItemIcon}
            active={false}
            prefetch={false}
            onClick={() => setMobileOpen(false)}
          >
            List an item
          </MobileNavRow>

          {me && (
            <>
              <p
                className="px-3 pt-3.5 pb-1 text-[10.5px] font-bold uppercase"
                style={{ color: "#a8a09a", letterSpacing: "0.06em" }}
              >
                Account
              </p>
              <MobileNavRow
                href="/dashboard"
                icon={DashboardMenuIcon}
                active={false}
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </MobileNavRow>
              <MobileNavButton
                icon={PurchasesIcon}
                onClick={() => {
                  setMobileOpen(false);
                  openList();
                }}
              >
                My purchases
              </MobileNavButton>
            </>
          )}
        </nav>

        {/* Footer auth */}
        {isLoading ? (
          <div
            className="px-4 pb-5 flex gap-2.5"
            style={{ borderTop: "1px solid #f0ece5", paddingTop: "0.75rem" }}
          >
            <div
              className="relative flex-1 h-11 rounded-full overflow-hidden"
              style={{ background: "#ede9e2" }}
            >
              <div className="skeleton-shimmer" />
            </div>
            <div
              className="relative flex-1 h-11 rounded-full overflow-hidden"
              style={{ background: "#f5f2ee" }}
            >
              <div className="skeleton-shimmer" />
            </div>
          </div>
        ) : (
          <div
            className="px-3 pb-3 flex flex-col"
            style={{ borderTop: "1px solid #f0ece5", paddingTop: "0.5rem" }}
          >
            {me ? (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  signOut();
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium text-left w-full transition-colors hover:bg-[#fef1f1]"
                style={{ color: "#e53e3e" }}
              >
                <span
                  className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                  style={{ background: "#fef1f1", color: "#e53e3e" }}
                >
                  <SignOutRegular fontSize={17} />
                </span>
                Sign out
              </button>
            ) : (
              <div className="flex gap-2.5 px-1 pb-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 flex items-center justify-center h-11 rounded-full text-[14.5px] font-medium transition-colors"
                  style={{ border: "1px solid #e8e4dc", color: "#16130f" }}
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 flex items-center justify-center h-11 rounded-full text-[14.5px] font-semibold transition-all duration-200"
                  style={{ background: "#4f46e5", color: "#ffffff" }}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
      <CartDrawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
      />
    </>
  );
}

function TransactionPill({
  transparent,
  onCartOpen,
}: {
  transparent: boolean;
  onCartOpen: () => void;
}) {
  const { openList } = useOrdersModal();
  const { count, loading: cartLoading } = useCart();

  const iconColor = transparent ? "rgba(255,255,255,0.92)" : "#16130f";
  const dividerColor = transparent
    ? "rgba(255,255,255,0.20)"
    : "rgba(22,19,15,0.10)";
  const hoverBg = transparent
    ? "rgba(255,255,255,0.12)"
    : "rgba(22,19,15,0.06)";

  return (
    <div
      className="flex items-center h-10 rounded-full"
      style={{
        border: transparent
          ? "1px solid rgba(255,255,255,0.22)"
          : "1px solid rgba(22,19,15,0.10)",
        background: transparent
          ? "rgba(255,255,255,0.08)"
          : "rgba(22,19,15,0.03)",
      }}
    >
      <Tooltip label="My orders">
        <button
          onClick={openList}
          aria-label="My orders"
          className="flex items-center justify-center h-full px-4 rounded-l-full transition-colors duration-150"
          style={{ color: iconColor }}
          onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <ShoppingBag size={16} strokeWidth={2} />
        </button>
      </Tooltip>

      <div className="w-px h-4 shrink-0" style={{ background: dividerColor }} />

      <Tooltip label="Cart" align="right">
        <button
          onClick={onCartOpen}
          aria-label={`Cart${count > 0 ? ` (${count} items)` : ""}`}
          className="relative flex items-center justify-center h-full px-4 rounded-r-full transition-colors duration-150"
          style={{ color: iconColor }}
          onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <ShoppingCart size={16} strokeWidth={2} />
          {!cartLoading && count > 0 && (
            <span
              className="absolute top-1 right-2 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold text-white"
              style={{
                background: "#4f46e5",
                boxShadow: "0 0 0 1.5px var(--cart-ring)",
              }}
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </Tooltip>
    </div>
  );
}
