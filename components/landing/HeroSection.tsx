import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

export function HeroSection() {
  return (
    <section className="bg-[#0F0F0F] min-h-[88vh] flex items-center px-4 md:px-8 py-16 overflow-hidden">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">

        {/* Left: copy */}
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
            <span className="text-xs text-white/50 font-medium tracking-wide">Nigeria&apos;s marketplace</span>
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-[56px] md:text-[68px] lg:text-[80px] text-white leading-[1.0] tracking-tight">
              Your stuff has<br />
              <em className="not-italic text-[#4F46E5]">a second story.</em>
            </h1>
            <p className="text-base md:text-lg text-white/45 leading-relaxed max-w-sm">
              Sell, give away, or donate what you no longer need — directly to people in your community.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#4F46E5] text-white text-sm font-semibold hover:bg-[#4338CA] transition-colors"
            >
              Browse listings <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/15 text-white/70 text-sm font-semibold hover:bg-white/5 hover:text-white transition-colors"
            >
              Start selling
            </Link>
          </div>

          {/* Trust bar */}
          <div className="flex items-center gap-6 pt-2">
            {[
              { label: "For Sale", color: "#4F46E5" },
              { label: "Free", color: "#10B981" },
              { label: "Donate", color: "#F59E0B" },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                <span className="text-xs text-white/35 font-medium">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: card collage — hidden on mobile */}
        <div className="relative h-[480px] hidden md:block">

          {/* Main card — top-right, forward */}
          <div
            className="absolute top-0 right-0 w-[260px] bg-white rounded-2xl p-4 z-20"
            style={{
              transform: "rotate(-3deg)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
          >
            <div className="aspect-[4/3] bg-neutral-100 rounded-xl mb-3.5 flex items-center justify-center text-3xl">
              📱
            </div>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900 text-sm leading-snug">iPhone 14 Pro</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={10} className="text-neutral-400" />
                  <span className="text-[11px] text-neutral-400">Lekki Phase 1</span>
                </div>
              </div>
              <span className="shrink-0 text-[10px] font-bold text-[#4F46E5] bg-[#4F46E5]/10 px-2 py-0.5 rounded-full">
                For Sale
              </span>
            </div>
            <p className="text-base font-bold text-[#4F46E5]">₦185,000</p>
          </div>

          {/* Secondary card — bottom-left, behind */}
          <div
            className="absolute bottom-0 left-0 w-[230px] bg-white rounded-2xl p-4 z-10"
            style={{
              transform: "rotate(4deg)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            }}
          >
            <div className="aspect-[4/3] bg-neutral-100 rounded-xl mb-3 flex items-center justify-center text-3xl">
              🛋️
            </div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900 text-sm truncate leading-snug">Blue Leather Sofa</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={10} className="text-neutral-400" />
                  <span className="text-[11px] text-neutral-400">Ajah, Lagos</span>
                </div>
              </div>
              <span className="shrink-0 text-[10px] font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                Free
              </span>
            </div>
          </div>

          {/* Floating donate pill — center bridge */}
          <div
            className="absolute top-[42%] left-[28%] z-30 bg-[#F59E0B] text-black rounded-full px-4 py-2 flex items-center gap-2"
            style={{
              transform: "rotate(-2deg)",
              boxShadow: "0 8px 24px rgba(245,158,11,0.4)",
            }}
          >
            <span className="text-sm">🚲</span>
            <span className="text-xs font-bold whitespace-nowrap">Kids&apos; Bicycle · Donate</span>
          </div>

        </div>
      </div>
    </section>
  );
}
