import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";
    
    const apiUrl = `${baseUrl}/api/listings/${id}`;
    console.log("Fetching metadata from:", apiUrl);
    
    const response = await fetch(apiUrl, {
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error("Failed to fetch listing metadata:", response.status);
      return {
        title: "Listing Not Found",
        description: "This listing could not be found on Declutter Marketplace.",
      };
    }

    const data = await response.json();
    const listing = data.listing;

    if (!listing) {
      console.error("No listing data in response");
      return {
        title: "Listing Not Found",
        description: "This listing could not be found on Declutter Marketplace.",
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

    const title = `${listing.title}${priceText} | Declutter`;
    const description =
      listing.description ||
      `${typeLabel} listing in ${listing.area}. ${listing.condition} condition. Browse more on Declutter Marketplace.`;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";
    const url = `${siteUrl}/listings/${id}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: "Declutter Marketplace",
        images: [
          {
            url: `${siteUrl}/listings/${id}/opengraph-image`,
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
        images: [`${siteUrl}/listings/${id}/opengraph-image`],
        creator: "@declutter_ng",
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
        "declutter",
      ],
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Declutter Marketplace",
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
