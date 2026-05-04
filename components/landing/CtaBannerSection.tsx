import Link from "next/link";
import { ArrowRight } from "lucide-react";

const BG   = "#0B0A09";
const TEXT = "#F0EEE9";

export function CtaBannerSection() {
  return (
    <section
      className="py-28 px-5 md:px-8"
      style={{ background: BG, borderTop: "1px solid rgba(240,238,233,0.06)" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-10">

        <div className="max-w-xl">
          <h2
            className="font-display leading-[1.0] mb-4"
            style={{ fontSize: "clamp(44px,6vw,80px)", color: TEXT }}
          >
            Ready to<br />
            <em className="not-italic" style={{ color: "rgba(240,238,233,0.22)" }}>explore?</em>
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "rgba(240,238,233,0.38)" }}>
            Everything near you — Lagos, Abuja, Port Harcourt, and beyond.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 md:pb-2">
          <Link
            href="/listings"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#6366F1", color: "#fff" }}
          >
            Browse all listings <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-sm font-semibold transition-colors hover:bg-white/5"
            style={{ border: "1px solid rgba(240,238,233,0.12)", color: "rgba(240,238,233,0.5)" }}
          >
            Start selling
          </Link>
        </div>

      </div>
    </section>
  );
}
