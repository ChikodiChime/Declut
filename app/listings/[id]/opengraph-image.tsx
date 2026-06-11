import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";

export const alt = "Listing on Declutter";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const { data: listing, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !listing) {
      throw new Error("Failed to fetch listing");
    }

    const typeColors: Record<string, string> = {
      for_sale: "#4f46e5",
      free: "#10b981",
      donate: "#f59e0b",
    };

    const typeColor = typeColors[listing.listing_type] || "#4f46e5";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "space-between",
            backgroundColor: "#fafaf9",
            padding: "60px 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  backgroundColor: typeColor,
                  color: "white",
                  padding: "8px 20px",
                  borderRadius: "999px",
                  fontSize: "18px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {listing.listing_type === "for_sale"
                  ? "For Sale"
                  : listing.listing_type === "free"
                  ? "Free"
                  : "Donate"}
              </div>
            </div>

            <h1
              style={{
                fontSize: "72px",
                fontWeight: "bold",
                color: "#1c1917",
                lineHeight: 1.1,
                margin: 0,
                maxWidth: "900px",
              }}
            >
              {listing.title}
            </h1>

            {listing.listing_type === "for_sale" && listing.price && (
              <p
                style={{
                  fontSize: "56px",
                  fontWeight: "bold",
                  color: typeColor,
                  margin: 0,
                }}
              >
                ₦{listing.price.toLocaleString()}
              </p>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "40px",
              fontSize: "24px",
              color: "#78716c",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span>📍</span>
              <span>{listing.area}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span>📦</span>
              <span>{listing.category}</span>
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: "60px",
              right: "80px",
              fontSize: "28px",
              fontWeight: "bold",
              color: "#a8a29e",
            }}
          >
            declutter.ng
          </div>
        </div>
      ),
      {
        ...size,
      }
    );
  } catch (error) {
    console.error("Error generating OG image:", error);

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fafaf9",
          }}
        >
          <h1
            style={{
              fontSize: "64px",
              fontWeight: "bold",
              color: "#1c1917",
            }}
          >
            Declutter Marketplace
          </h1>
        </div>
      ),
      {
        ...size,
      }
    );
  }
}
