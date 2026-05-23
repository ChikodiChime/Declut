
import { ArcCarousel } from "./ArcCarousel";
import type { Listing } from "@/types";

export function HeroSection({ listings }: { listings: Listing[] }) {
  return (
    <section
      className="relative flex flex-col"
      style={{
        marginTop:
          "-80px" /* pull up behind floating pill navbar (18px top gap + 60px pill) */,
        minHeight: "100svh",
        background:
          "linear-gradient(155deg, #1e1b4b 0%, #3730a3 55%, #4338ca 100%)",
      }}
    >
      {/* ── Decorative layer — same language as the auth panel left side ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Filled circle — top-right (mirrors auth panel) */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5" />
        {/* Filled circle — bottom-left (mirrors auth panel) */}
        <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-white/5" />
        {/* Large centre orb (mirrors auth panel) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.03]" />
        {/* Dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: 120,
            background:
              "linear-gradient(to top, rgba(30,27,75,0.55) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Text content — pt-16 clears the 64 px navbar; flex-1 centres the rest ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-5 pt-16 pb- w-full">
        {/* Eyebrow */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-xs font-medium"
          style={{
            background: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.75)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#a5b4fc]" />
          Nigeria&apos;s marketplace
        </div>

        <h1
          className="font-display text-white leading-none tracking-tight mb-5 lg:whitespace-nowrap"
          style={{ fontSize: "clamp(42px, 9.5vw, 120px)" }}
        >
          Declutter <span style={{ color: "#a5b4fc" }}>&</span> Discover
        </h1>

        <p
          className="text-base md:text-lg leading-relaxed mb-10 max-w-lg mx-auto"
          style={{ color: "rgba(255,255,255,0.58)" }}
        >
          Sell or give away what you no longer need — and find great deals on
          everything near you.
        </p>

        {/* <div className="flex items-center justify-center flex-wrap gap-3">
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "white", color: "#312e81" }}
          >
            Start browsing <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold transition-colors hover:bg-white/10"
            style={{
              border: "1px solid rgba(255,255,255,0.25)",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            List an item
          </Link>
        </div> */}
      </div>

      {/* ── Carousel slot — 180 px tall at the bottom of the hero viewport.          ── */}
      {/* ── The ArcCarousel container is 360 px; the lower 180 px overflows below    ── */}
      {/* ── the section and is covered by the next section's background, so only     ── */}
      {/* ── the tops of the cards peek into view — exactly the "small part" effect.  ── */}
      <div
        className="relative z-10 flex-shrink-0 w-full"
        style={{ height: 180, overflow: "visible" }}
      >
        <ArcCarousel listings={listings} />
      </div>
    </section>
  );
}
