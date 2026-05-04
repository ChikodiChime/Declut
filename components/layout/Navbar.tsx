import Link from "next/link";
import { Button } from "@/components/ui";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="declut" className="h-7" />
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/listings"
            className="text-sm font-medium text-text-muted hover:text-text transition-colors"
          >
            Browse listings
          </Link>
        </nav>

        {/* Auth CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="hidden sm:block text-sm font-semibold text-text-muted hover:text-text transition-colors"
          >
            Sign in
          </Link>
          <Button href="/auth/signup" size="sm">
            Get started
          </Button>
        </div>
      </div>
    </header>
  );
}
