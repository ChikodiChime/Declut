"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import {
  LayoutDashboard,
  ShoppingBag,
  LogOut,
  ShoppingCart,
} from "lucide-react";
import { getSessionCart } from "@/lib/session-cart";
import { useMe, useSignOut } from "@/lib/hooks/useAuth";

const HIDDEN_PREFIXES = ["/dashboard", "/auth", "/login", "/dispatch", "/verify-email", "/admin"];
const SCROLL_THRESHOLD = 16;

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

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const ringStyle = transparent
    ? { boxShadow: open ? "0 0 0 2px rgba(255,255,255,0.45)" : "inset 0 0 0 1px rgba(255,255,255,0.22)" }
    : { boxShadow: open ? "0 0 0 3px rgba(22,19,15,0.12)" : "0 1px 2px rgba(22,19,15,0.12)" };

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
              icon={LayoutDashboard}
              onClick={() => setOpen(false)}
            >
              Dashboard
            </MenuLink>
            <MenuLink
              href="/dashboard/orders?tab=purchases"
              icon={ShoppingBag}
              onClick={() => setOpen(false)}
            >
              My purchases
            </MenuLink>
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
              <LogOut size={14} strokeWidth={1.8} />
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
  icon: React.ElementType;
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
      <Icon size={14} strokeWidth={1.8} style={{ color: "#a8a09a" }} />
      {children}
    </Link>
  );
}

export function NavbarWrapper() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const { data: me, isLoading } = useMe();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const DARK_HERO_ROUTES = ["/", "/listings"];
  const hasDarkHero = DARK_HERO_ROUTES.includes(pathname);
  const transparent = hasDarkHero && !scrolled;

  // Colour tokens for the two visual modes
  const linkColor = transparent ? "rgba(255,255,255,0.78)" : "#56524d";
  const linkHover = transparent ? "#ffffff" : "#16130f";

  return (
    <header
      className="sticky top-0 z-50 pointer-events-none transition-all duration-300 ease-out"
      style={{ paddingTop: scrolled ? 12 : 18 }}
    >
      <div
        className="mx-auto transition-all duration-300 ease-out pointer-events-auto"
        style={{
          maxWidth: scrolled
            ? "min(72rem, calc(100% - 24px))"
            : "min(80rem, calc(100% - 24px))",
          borderRadius: 9999,
          background: transparent
            ? "rgba(22,19,15,0.28)"
            : "rgba(255,255,255,0.72)",
          backdropFilter: "blur(16px) saturate(160%)",
          WebkitBackdropFilter: "blur(16px) saturate(160%)",
          border: transparent
            ? "1px solid rgba(255,255,255,0.14)"
            : "1px solid rgba(232,228,220,0.9)",
          boxShadow: transparent
            ? "0 1px 0 rgba(255,255,255,0.08) inset, 0 12px 32px -16px rgba(0,0,0,0.35)"
            : "0 1px 0 rgba(255,255,255,0.7) inset, 0 1px 2px rgba(22,19,15,0.04), 0 12px 32px -18px rgba(22,19,15,0.18)",
        }}
      >
        <div className="relative pl-4 pr-2.5 md:pl-5 md:pr-3 h-[60px] flex items-center justify-between">
          {/* Logo + tagline */}
          <div className="flex items-center gap-3.5 shrink-0">
            <Link
              href="/"
              className="relative h-8 block"
              style={{ minWidth: 104 }}
              aria-label="declut home"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="declut"
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
            <span
              aria-hidden="true"
              className="hidden lg:block h-4 w-px"
              style={{
                background: transparent
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(22,19,15,0.12)",
              }}
            />
            <span
              className="hidden lg:inline-block text-[11.5px] font-medium tracking-wide uppercase"
              style={{
                color: transparent
                  ? "rgba(255,255,255,0.62)"
                  : "rgba(86,82,77,0.85)",
                letterSpacing: "0.08em",
              }}
            >
              Nigeria’s marketplace
            </span>
          </div>

          {/* Nav links — centre */}
          <nav className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
            <NavItem href="/listings" color={linkColor} hover={linkHover}>
              Browse
            </NavItem>
            <NavItem
              href="/listings?listing_type=free"
              color={linkColor}
              hover={linkHover}
            >
              Free finds
            </NavItem>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <CartButton transparent={transparent} />

            {!isLoading &&
              (me ? (
                <ProfileMenu name={me.name ?? null} avatarUrl={me.avatar_url ?? null} transparent={transparent} />
              ) : (
                <div className="flex items-center gap-1">
                  <Link
                    href="/auth/login"
                    className="hidden sm:inline-flex items-center px-3 h-9 text-[13.5px] font-medium transition-colors duration-200"
                    style={{ color: linkColor }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = linkHover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = linkColor)
                    }
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center justify-center h-9 px-4 rounded-full text-[13.5px] font-semibold transition-all duration-200"
                    style={
                      transparent
                        ? {
                            background: "#ffffff",
                            color: "#3730a3",
                            boxShadow:
                              "0 1px 2px rgba(0,0,0,0.08), 0 6px 16px -6px rgba(0,0,0,0.28)",
                          }
                        : {
                            background: "#4f46e5",
                            color: "#ffffff",
                            boxShadow:
                              "0 1px 2px rgba(79,70,229,0.25), 0 6px 16px -6px rgba(79,70,229,0.55)",
                          }
                    }
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      if (!transparent)
                        e.currentTarget.style.background = "#4338ca";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      if (!transparent)
                        e.currentTarget.style.background = "#4f46e5";
                    }}
                  >
                    Sign up
                  </Link>
                </div>
              ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function CartButton({ transparent }: { transparent: boolean }) {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchCount() {
      try {
        const res = await fetch("/api/cart");
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setCount(data.data?.length ?? 0);
        } else if (res.status === 401) {
          setCount(getSessionCart().length);
        }
      } catch {
        /* noop */
      } finally {
        if (!cancelled) setMounted(true);
      }
    }
    fetchCount();
    const onUpdate = () => fetchCount();
    window.addEventListener("cart-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("cart-updated", onUpdate);
    };
  }, []);

  if (!mounted) return null;

  const baseBg = transparent
    ? "rgba(255,255,255,0.10)"
    : "rgba(22,19,15,0.045)";
  const hoverBg = transparent
    ? "rgba(255,255,255,0.18)"
    : "rgba(22,19,15,0.08)";
  const iconColor = transparent ? "rgba(255,255,255,0.92)" : "#16130f";

  return (
    <Link
      href="/cart"
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
    </Link>
  );
}

function NavItem({
  href,
  children,
  color,
  hover,
}: {
  href: string;
  children: React.ReactNode;
  color: string;
  hover: string;
}) {
  return (
    <Link
      href={href}
      className="group relative text-[14px] font-semibold tracking-tight transition-colors duration-200"
      style={{ color }}
      onMouseEnter={(e) => (e.currentTarget.style.color = hover)}
      onMouseLeave={(e) => (e.currentTarget.style.color = color)}
    >
      {children}
      <span
        aria-hidden="true"
        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-[2px] w-0 group-hover:w-4 transition-all duration-200 rounded-full"
        style={{ background: hover }}
      />
    </Link>
  );
}
