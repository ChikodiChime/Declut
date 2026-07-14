import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { id } = params;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/listings/${id}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return {
        title: "Listing Not Found | Unstash",
        description: "This listing could not be found on Unstash Marketplace.",
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

    const title = `${listing.title}${priceText} | Unstash`;
    const description =
      listing.description ||
      `${typeLabel} listing in ${listing.area}. ${listing.condition} condition. Browse more on Unstash Marketplace.`;

    const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://unstash.ng"}/listings/${id}`;
    const imageUrl = listing.images?.[0] || "/og-image.png";

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
