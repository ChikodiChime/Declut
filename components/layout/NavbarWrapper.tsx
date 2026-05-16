"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CartIcon } from "./CartIcon";

const HIDDEN_PREFIXES = ["/dashboard", "/auth"];
const SCROLL_THRESHOLD = 24;

function NavLink({
  href,
  transparent,
  children,
}: {
  href: string;
  transparent: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="relative text-sm font-medium tracking-wide transition-opacity duration-200 hover:opacity-100 group"
      style={{
        color: transparent ? "rgba(255,255,255,0.75)" : "#78726c",
        letterSpacing: "0.025em",
      }}
    >
      {children}
      <span
        className="absolute -bottom-0.5 left-0 h-px w-full scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"
        style={{
          background: transparent ? "rgba(255,255,255,0.5)" : "#78726c",
        }}
      />
    </Link>
  );
}

export function NavbarWrapper() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const transparent = pathname === "/" && !scrolled;

  return (
    <header
      className="sticky top-0 z-50 transition-[background,backdrop-filter] duration-300"
      style={{
        background: transparent ? "transparent" : "rgba(250,250,248,0.93)",
        backdropFilter: transparent ? "none" : "blur(14px)",
      }}
    >
      <div className="max-w-screen-xl mx-auto px-6 md:px-10 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="relative shrink-0 h-8 block" style={{ minWidth: 100 }}>
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

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          <NavLink href="/listings" transparent={transparent}>
            Browse
          </NavLink>
        </nav>

        {/* Right-side actions */}
        <div className="flex items-center gap-5">
          <CartIcon transparent={transparent} />

          <NavLink href="/auth/login" transparent={transparent}>
            <span className="hidden md:inline">Sign in</span>
          </NavLink>

          {/* Separator */}
          <div
            className="hidden md:block h-4 w-px shrink-0 transition-opacity duration-300"
            style={{
              background: transparent ? "rgba(255,255,255,0.25)" : "#d4cfc6",
            }}
          />

          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center px-4 py-1.5 text-[13px] font-semibold tracking-wide transition-all duration-200"
            style={
              transparent
                ? {
                    background: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.92)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: 6,
                  }
                : {
                    background: "#16130f",
                    color: "#fafaf8",
                    border: "1px solid transparent",
                    borderRadius: 6,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
                  }
            }
          >
            Get started
          </Link>
        </div>
      </div>

      {/* Gradient border bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px transition-opacity duration-300"
        style={{
          background:
            "linear-gradient(to right, transparent, #e8e4dc 12%, #e8e4dc 88%, transparent)",
          opacity: transparent ? 0 : 1,
        }}
      />
    </header>
  );
}
