"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import {
  LayoutDashboard,
  ShoppingBag,
  LogOut,
  ShoppingCart,
  Search,
  X,
  Plus,
} from "lucide-react";
import { useMe, useSignOut } from "@/lib/hooks/useAuth";
import { useCart } from "@/lib/hooks/useCart";

const HIDDEN_PREFIXES = [
  "/dashboard",
  "/auth",
  "/login",
  "/dispatch",
  "/verify-email",
  "/admin",
];

const SCROLL_THRESHOLD = 16;
const SEARCH_THRESHOLD = 350;

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
              <p className="text-[11px] font-medium mb-0.5" style={{ color: "#a8a09a" }}>
                Signed in as
              </p>
              <p className="text-sm font-semibold truncate" style={{ color: "#16130f" }}>
                {name}
              </p>
            </div>
          )}
          <div className="py-1">
            <MenuLink href="/dashboard" icon={LayoutDashboard} onClick={() => setOpen(false)}>
              Dashboard
            </MenuLink>
            <MenuLink href="/dashboard/orders?tab=purchases" icon={ShoppingBag} onClick={() => setOpen(false)}>
              My purchases
            </MenuLink>
          </div>
          <div style={{ borderTop: "1px solid #f0ece5" }} className="py-1">
            <button
              onClick={() => { setOpen(false); signOut(); }}
              className="w-full flex items-center gap-3 px-4 py-2 text-[13px] font-medium transition-colors text-left"
              style={{ color: "#e53e3e" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fff5f5")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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

function NavbarSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-stretch w-full overflow-hidden"
      style={{
        maxWidth: 440,
        borderRadius: "10px",
        border: "1.5px solid #c7d2fe",
        background: "#eef2ff",
        transition: "border-color 180ms, box-shadow 180ms",
      }}
      onFocusCapture={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#4f46e5";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(79,70,229,0.12)";
      }}
      onBlurCapture={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#c7d2fe";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div className="relative flex-1 flex items-center" style={{ minWidth: 0 }}>
        <Search
          size={14}
          strokeWidth={2}
          className="absolute left-3.5 pointer-events-none shrink-0"
          style={{ color: "#6366f1" }}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search listings…"
          className="w-full h-10 pl-9 pr-3 text-[13.5px] bg-transparent focus:outline-none"
          style={{ color: "#16130f" }}
        />
        {value && (
          <button
            type="button"
            onClick={() => { setValue(""); inputRef.current?.focus(); }}
            className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full shrink-0"
            style={{ color: "#6366f1" }}
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        )}
      </div>
      <button
        type="submit"
        className="h-10 w-10 flex shrink-0 items-center justify-center transition-all duration-150"
        style={{ background: "#4f46e5", color: "#ffffff" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#4338ca"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#4f46e5"; }}
      >
        <Search size={14} strokeWidth={2.5} />
      </button>
    </form>
  );
}

export function NavbarWrapper() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { data: me, isLoading } = useMe();

  useEffect(() => {
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

  const DARK_HERO_ROUTES = ["/", "/about"];
  const hasDarkHero = DARK_HERO_ROUTES.includes(pathname);
  const transparent = hasDarkHero && !scrolled;

  const linkColor = transparent ? "rgba(255,255,255,0.78)" : "#56524d";
  const linkHover = transparent ? "#ffffff" : "#16130f";

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: transparent ? "transparent" : "#ffffff",
        borderBottom: scrolled ? "1px solid #e8e4dc" : "none",
        boxShadow: scrolled ? "0 1px 0 0 #e8e4dc, 0 4px 16px -4px rgba(22,19,15,0.08)" : "none",
        transition: "background 300ms ease, box-shadow 300ms ease, border-color 300ms ease",
      }}
    >
      {/* Top-scrim so logo/links are legible over the dark hero photo */}
      {transparent && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.32) 0%, transparent 100%)",
          }}
        />
      )}

      <div className="relative max-w-screen-xl mx-auto px-6 md:px-10 h-[68px] flex items-center gap-3">

        {/* Logo */}
        <Link
          href="/"
          className="relative h-9 shrink-0 block"
          style={{ minWidth: 100 }}
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

        {/* Browse link — fades out when search appears */}
        <div
          className="hidden md:flex items-center ml-2"
          style={{
            opacity: showSearch ? 0 : 1,
            pointerEvents: showSearch ? "none" : "auto",
            transition: "opacity 280ms ease",
          }}
        >
          <Link
            href="/search"
            className="text-[13.5px] font-medium px-3 py-1.5 rounded-full transition-all duration-200"
            style={{ color: linkColor }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = linkHover;
              (e.currentTarget as HTMLElement).style.background = transparent
                ? "rgba(255,255,255,0.10)"
                : "rgba(22,19,15,0.05)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = linkColor;
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            Browse
          </Link>
        </div>

        {/* Center: search bar slides in on scroll */}
        <div className="flex-1 flex justify-center">
          <div
            className="w-full"
            style={{
              maxWidth: 440,
              opacity: showSearch || isSearchPage ? 1 : 0,
              transform: showSearch || isSearchPage ? "translateY(0)" : "translateY(-8px)",
              pointerEvents: showSearch || isSearchPage ? "auto" : "none",
              transition: "opacity 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <NavbarSearch />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* List an item */}
          <Link
            href="/dashboard/listings/new"
            className="hidden md:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold transition-all duration-200"
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
            <Plus size={13} strokeWidth={2.5} />
            List an item
          </Link>

          {/* Divider */}
          <div
            className="hidden md:block w-px h-5 mx-1 shrink-0"
            style={{ background: transparent ? "rgba(255,255,255,0.18)" : "#e8e4dc" }}
          />

          <CartButton transparent={transparent} />

          {!isLoading &&
            (me ? (
              <ProfileMenu
                name={me.name ?? null}
                avatarUrl={me.avatar_url ?? null}
                transparent={transparent}
              />
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  href="/auth/login"
                  className="hidden sm:inline-flex items-center px-3 h-9 text-[13.5px] font-medium rounded-full transition-all duration-200"
                  style={{ color: linkColor }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = linkHover;
                    (e.currentTarget as HTMLElement).style.background = transparent
                      ? "rgba(255,255,255,0.10)"
                      : "rgba(22,19,15,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = linkColor;
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
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
                          boxShadow: "0 1px 2px rgba(0,0,0,0.10), 0 4px 12px -4px rgba(0,0,0,0.22)",
                        }
                      : {
                          background: "#4f46e5",
                          color: "#ffffff",
                          boxShadow: "0 1px 2px rgba(79,70,229,0.20), 0 4px 12px -4px rgba(79,70,229,0.45)",
                        }
                  }
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                    if (!transparent) (e.currentTarget as HTMLElement).style.background = "#4338ca";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    if (!transparent) (e.currentTarget as HTMLElement).style.background = "#4f46e5";
                  }}
                >
                  Sign up
                </Link>
              </div>
            ))}
        </div>
      </div>
    </header>
  );
}

function CartButton({ transparent }: { transparent: boolean }) {
  const { count, loading } = useCart();
  const [hover, setHover] = useState(false);

  if (loading) return null;

  const baseBg = transparent ? "rgba(255,255,255,0.10)" : "rgba(22,19,15,0.045)";
  const hoverBg = transparent ? "rgba(255,255,255,0.18)" : "rgba(22,19,15,0.08)";
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
          style={{ background: "#4f46e5", boxShadow: "0 0 0 2px var(--cart-ring)" }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

