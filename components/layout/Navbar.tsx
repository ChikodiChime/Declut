import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-[#0F0F0F]">
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-[68px] flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.svg" alt="declut" className="h-7" />
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/listings"
            className="text-sm font-medium text-white/50 hover:text-white transition-colors"
          >
            Browse
          </Link>
          <Link
            href="/auth/login"
            className="text-sm font-medium text-white/50 hover:text-white transition-colors"
          >
            Sign in
          </Link>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="md:hidden text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white text-[#0F0F0F] text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
