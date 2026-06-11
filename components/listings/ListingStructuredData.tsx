"use client";

import type { ListingWithSeller } from "@/types";

interface ListingStructuredDataProps {
  listing: ListingWithSeller;
}

export function ListingStructuredData({ listing }: ListingStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description || `${listing.title} in ${listing.area}`,
    image: listing.images?.[0] || "",
    offers: {
      "@type": "Offer",
      price: listing.listing_type === "for_sale" ? listing.price : 0,
      priceCurrency: "NGN",
      availability:
        listing.status === "available"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: `https://schema.org/${
        listing.condition === "new"
          ? "NewCondition"
          : listing.condition === "like_new"
          ? "RefurbishedCondition"
          : "UsedCondition"
      }`,
      seller: {
        "@type": "Person",
        name: listing.seller?.full_name || "Declutter User",
      },
    },
    category: listing.category,
    brand: {
      "@type": "Brand",
      name: "Declutter Marketplace",
    },
    ...(listing.area && {
      areaServed: {
        "@type": "Place",
        name: listing.area,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
