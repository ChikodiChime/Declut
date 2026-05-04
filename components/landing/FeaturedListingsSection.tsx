import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrowseCard } from "@/components/listings";
import { Button } from "@/components/ui";
import type { Listing } from "@/types";

interface FeaturedListingsSectionProps {
  listings: Listing[];
}

export function FeaturedListingsSection({ listings }: FeaturedListingsSectionProps) {
  if (listings.length === 0) return null;

  const large = listings.slice(0, 2);
  const rest = listings.slice(2);

  return (
    <section className="bg-[#FAF9F6] py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-xs font-semibold text-[#10B981] tracking-wide uppercase">Live</span>
            </div>
            <h2 className="font-display text-5xl md:text-6xl text-[#0F0F0F] leading-tight">
              Just listed
            </h2>
          </div>
          <Link
            href="/listings"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#4F46E5] hover:underline shrink-0 pb-1"
          >
            See all <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>

        {/* Mobile: uniform 2-col grid */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {listings.map((listing) => (
            <BrowseCard key={listing.id} listing={listing} />
          ))}
        </div>

        {/* Desktop: asymmetric layout */}
        <div className="hidden md:grid md:grid-cols-[3fr_2fr] gap-5">
          <div className="flex flex-col gap-5">
            {large.map((listing) => (
              <BrowseCard key={listing.id} listing={listing} />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            {rest.map((listing) => (
              <BrowseCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="sm:hidden text-center pt-2">
          <Button href="/listings" variant="outline" className="gap-2">
            See all listings <ArrowRight size={16} strokeWidth={2} />
          </Button>
        </div>
      </div>
    </section>
  );
}
