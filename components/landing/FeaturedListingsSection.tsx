import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrowseCard } from "@/components/listings";
import type { Listing } from "@/types";

const BG   = "#0F0E0D";
const TEXT = "#F0EEE9";

interface FeaturedListingsSectionProps {
  listings: Listing[];
}

export function FeaturedListingsSection({ listings }: FeaturedListingsSectionProps) {
  if (listings.length === 0) return null;

  const large = listings.slice(0, 2);
  const rest  = listings.slice(2);

  return (
    <section className="py-20 px-5 md:px-8" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#34D399" }}>
                Live
              </span>
            </div>
            <h2
              className="font-display leading-tight"
              style={{ fontSize: "clamp(40px,5vw,60px)", color: TEXT }}
            >
              Just listed
            </h2>
          </div>
          <Link
            href="/listings"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold pb-1 transition-opacity hover:opacity-70"
            style={{ color: "#818CF8" }}
          >
            See all <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>

        {/* Mobile: 2-col grid */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {listings.map((l) => <BrowseCard key={l.id} listing={l} />)}
        </div>

        {/* Desktop: asymmetric */}
        <div className="hidden md:grid md:grid-cols-[3fr_2fr] gap-5">
          <div className="flex flex-col gap-5">
            {large.map((l) => <BrowseCard key={l.id} listing={l} />)}
          </div>
          <div className="flex flex-col gap-4">
            {rest.map((l) => <BrowseCard key={l.id} listing={l} />)}
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="sm:hidden text-center pt-2">
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold"
            style={{ border: "1px solid rgba(240,238,233,0.12)", color: "rgba(240,238,233,0.55)" }}
          >
            See all listings <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
        </div>

      </div>
    </section>
  );
}
