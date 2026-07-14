import Link from "next/link";

const NAV_LINKS = [
  { label: "About", href: "/about" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Unstash"
            className="h-6 w-auto"
            style={{ maxWidth: 90 }}
          />
          <nav className="flex items-center gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] text-gray-400 hover:text-gray-700 transition-colors duration-150"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-[12px] text-gray-300">
            © {new Date().getFullYear()} Unstash
          </p>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-400">
            Beta
          </span>
        </div>
      </div>
    </footer>
  );
}
