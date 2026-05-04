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
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
            <h2 className="text-4xl font-bold text-text">Just listed</h2>
          </div>
          <Link
            href="/listings"
            className="hidden sm:flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
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
          {/* Left: 2 large cards */}
          <div className="flex flex-col gap-5">
            {large.map((listing) => (
              <BrowseCard key={listing.id} listing={listing} />
            ))}
          </div>

          {/* Right: remaining cards */}
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
