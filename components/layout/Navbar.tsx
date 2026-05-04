import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50" style={{ background: "#0B0A09" }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.svg" alt="declut" className="h-6" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/listings" className="nav-link text-sm font-medium">Browse</Link>
          <Link href="/auth/login" className="nav-link text-sm font-medium">Sign in</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="nav-link md:hidden text-sm font-medium">Sign in</Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center px-5 py-2 rounded-full text-sm font-semibold"
            style={{ background: "#F0EEE9", color: "#0B0A09" }}
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
