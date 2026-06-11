import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/listings/${id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        title: "Listing Not Found | Declutter",
        description: "This listing could not be found on Declutter Marketplace.",
      };
    }

    const data = await response.json();
    const listing = data.listing;

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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://declutter.ng";
    const url = `${siteUrl}/listings/${id}`;
    const imageUrl = listing.images?.[0]
      ? `${siteUrl}${listing.images[0]}`
      : `${siteUrl}/listings/${id}/opengraph-image`;

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
            url: imageUrl,
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
        images: [imageUrl],
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
