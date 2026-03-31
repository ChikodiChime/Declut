import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-surface flex items-center justify-center px-4 overflow-hidden">
      {/* Decorative circle — top-right, indigo tint */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary pointer-events-none"
        style={{ opacity: 0.06, transform: "translate(40%, -40%)" }}
      />
      {/* Decorative circle — bottom-left, amber tint */}
      <div
        className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-accent pointer-events-none"
        style={{ opacity: 0.08, transform: "translate(-40%, 40%)" }}
      />

      {/* Content */}
      <div className="relative w-full max-w-sm text-center space-y-10">
        {/* Logo */}
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="declut" className="h-12" />
        </div>

        {/* Tagline */}
        <p className="text-lg leading-relaxed" style={{ color: "#64748B" }}>
          Nigeria&apos;s marketplace for things that deserve a second home
        </p>

        {/* CTAs */}
        <div className="space-y-3">
          <Link
            href="/auth/login"
            className="flex w-full items-center justify-center rounded-md bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="flex w-full items-center justify-center rounded-md bg-accent px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
