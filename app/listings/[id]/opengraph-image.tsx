import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";

export const alt = "Listing on Unstash";
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

    const photoId: string | undefined = listing.images?.[0];
    const photoUrl = photoId
      ? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/w_630,h_630,c_fill,g_auto/${photoId}`
      : undefined;

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            backgroundColor: "#fafaf9",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: photoUrl ? "570px" : "100%",
              padding: "60px 56px",
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
                  fontSize: photoUrl ? "56px" : "72px",
                  fontWeight: "bold",
                  color: "#1c1917",
                  lineHeight: 1.1,
                  margin: 0,
                  maxWidth: photoUrl ? "460px" : "900px",
                }}
              >
                {listing.title}
              </h1>

              {listing.listing_type === "for_sale" && listing.price && (
                <p
                  style={{
                    fontSize: "48px",
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
                flexDirection: "column",
                gap: "16px",
                fontSize: "22px",
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
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#a8a29e",
                }}
              >
                unstash.ng
              </div>
            </div>
          </div>

          {photoUrl && (
            <img
              src={photoUrl}
              width={630}
              height={630}
              style={{ objectFit: "cover" }}
              alt=""
            />
          )}
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
            Unstash Marketplace
          </h1>
        </div>
      ),
      {
        ...size,
      }
    );
  }
}
