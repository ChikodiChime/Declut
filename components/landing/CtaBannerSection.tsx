import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaBannerSection() {
  return (
    <section className="bg-[#0F0F0F] py-28 px-4 md:px-8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-10">

        {/* Left: headline */}
        <div className="space-y-4 max-w-xl">
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl text-white leading-[1.0]">
            Ready to<br />
            <em className="not-italic text-white/30">explore?</em>
          </h2>
          <p className="text-white/40 text-base leading-relaxed">
            Everything near you — Lagos, Abuja, and beyond.
          </p>
        </div>

        {/* Right: CTA */}
        <div className="flex flex-col sm:flex-row gap-3 md:pb-2">
          <Link
            href="/listings"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-[#4F46E5] text-white text-sm font-semibold hover:bg-[#4338CA] transition-colors"
          >
            Browse all listings <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-white/15 text-white/60 text-sm font-semibold hover:bg-white/5 hover:text-white transition-colors"
          >
            Start selling
          </Link>
        </div>

      </div>
    </section>
  );
}
