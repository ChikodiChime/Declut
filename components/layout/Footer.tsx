import Link from "next/link";

const NAV = [
  { label: "Browse listings", href: "/" },
  { label: "Sell an item", href: "/dashboard/listings/new" },
  { label: "About", href: "/about" },
  { label: "Sign up", href: "/auth/signup" },
  { label: "Log in", href: "/auth/login" },
];

const LEGAL = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export function Footer() {
  return (
    <footer
      className="bg-[#fafaf8] px-5 pt-12 pb-8 md:px-8"
      style={{ borderTop: "1px solid #e8e4dc" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Top row */}
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand */}
          <div className="max-w-xs">
            <span className="font-display text-xl font-bold text-[#16130f]">
              declut
            </span>
            <p className="mt-2 text-sm leading-relaxed text-[#a8a09a]">
              Nigeria&apos;s marketplace for things that deserve a second home.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap gap-x-8 gap-y-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-[#78726c] transition-colors hover:text-[#16130f]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-[#e8e4dc]" />

        {/* Bottom row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#a8a09a]">
            © {new Date().getFullYear()} Declut. Made in Nigeria.
          </p>
          <div className="flex gap-4">
            {LEGAL.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs text-[#a8a09a] transition-colors hover:text-[#78726c]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
