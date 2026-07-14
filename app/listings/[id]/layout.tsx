import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const { data: listing, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !listing) {
      console.error("Failed to fetch listing metadata:", error);
      return {
        title: "Listing Not Found",
        description: "This listing could not be found on Unstash Marketplace.",
      };
    }

    const typeLabel =
      listing.listing_type === "for_sale"
        ? "For Sale"
        : listing.listing_type === "free"
        ? "Free"
        : "Donate";

    const priceText =
      listing.listing_type === "for_sale" && listing.price
        ? ` - ₦${listing.price.toLocaleString()}`
        : listing.listing_type === "free"
        ? " - Free"
        : "";

    const title = `${listing.title}${priceText} | Unstash`;
    const description =
      listing.description ||
      `${typeLabel} listing in ${listing.area}. ${listing.condition} condition. Browse more on Unstash Marketplace.`;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://unstash-beta.netlify.app";
    const url = `${siteUrl}/listings/${id}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: "Unstash Marketplace",
        images: [
          {
            url: `${siteUrl}/listings/${id}/opengraph-image.png?v=2`,
            width: 1200,
            height: 630,
            alt: listing.title,
          },
        ],
        locale: "en_NG",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [`${siteUrl}/listings/${id}/opengraph-image.png?v=2`],
        creator: "@unstash_ng",
      },
      alternates: {
        canonical: url,
      },
      robots: {
        index: listing.status === "available",
        follow: true,
      },
      keywords: [
        listing.category,
        listing.area,
        typeLabel,
        listing.condition,
        "Nigeria marketplace",
        "secondhand",
        "unstash",
      ],
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Unstash Marketplace",
      description: "Buy, sell, and donate secondhand items in Nigeria.",
    };
  }
}

export default function ListingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
