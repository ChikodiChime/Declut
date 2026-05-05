"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const HIDDEN_PREFIXES = ["/dashboard", "/auth"];
const SCROLL_THRESHOLD = 24;

export function NavbarWrapper() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    // Set initial state in case the page loaded mid-scroll
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const transparent = pathname === "/" && !scrolled;

  return (
    <header
      className="sticky top-0 z-50 transition-[background,border-color,backdrop-filter] duration-300"
      style={{
        background: transparent ? "transparent" : "rgba(250,250,248,0.92)",
        backdropFilter: transparent ? "none" : "blur(12px)",
        borderBottom: `1px solid ${transparent ? "transparent" : "#e8e4dc"}`,
      }}
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        {/* Logo — cross-fade between dark and light versions */}
        <Link
          href="/"
          className="relative shrink-0 h-10 block"
          style={{ minWidth: 120 }}
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

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/listings"
            className="text-sm font-medium transition-colors duration-300 hover:opacity-70"
            style={{
              color: transparent ? "rgba(255,255,255,0.82)" : "#78726c",
            }}
          >
            Browse
          </Link>
          <Link
            href="/auth/login"
            className="text-sm font-medium transition-colors duration-300 hover:opacity-70"
            style={{
              color: transparent ? "rgba(255,255,255,0.82)" : "#78726c",
            }}
          >
            Sign in
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="md:hidden text-sm font-medium transition-colors duration-300 hover:opacity-70"
            style={{
              color: transparent ? "rgba(255,255,255,0.82)" : "#78726c",
            }}
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 hover:opacity-90"
            style={
              transparent
                ? {
                    background: "rgba(255,255,255,0.14)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.28)",
                  }
                : {
                    background: "#4f46e5",
                    color: "white",
                    border: "1px solid transparent",
                  }
            }
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
