import { supabase } from "@/lib/supabase";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { CategoryStripSection } from "@/components/landing/CategoryStripSection";
import { FeaturedListingsSection } from "@/components/landing/FeaturedListingsSection";
import { CtaBannerSection } from "@/components/landing/CtaBannerSection";
import type { Listing } from "@/types";

async function getFeaturedListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) return [];
  return (data ?? []) as Listing[];
}

export default async function Home() {
  const listings = await getFeaturedListings();

  return (
    <main>
      <HeroSection listings={listings} />
      <HowItWorksSection />
      <CategoryStripSection />
      <FeaturedListingsSection listings={listings} />
      <CtaBannerSection />
    </main>
  );
}
