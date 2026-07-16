import { ImageResponse } from "next/og";

export const BRAND_OG_SIZE = { width: 1200, height: 630 };

const LOGO_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="220" height="220" fill="none">
  <g transform="translate(3,4) rotate(-6 24.7 23) scale(0.88)">
    <path d="M25.5 5H38a5 5 0 0 1 5 5v12.5a5 5 0 0 1-1.46 3.54L26.04 41.54a5 5 0 0 1-7.08 0L6.46 29.04a5 5 0 0 1 0-7.08L21.96 6.46A5 5 0 0 1 25.5 5Z" fill="#312e81"/>
  </g>
  <path fill-rule="evenodd" fill="#3730a3"
    d="M25.5 5H38a5 5 0 0 1 5 5v12.5a5 5 0 0 1-1.46 3.54L26.04 41.54a5 5 0 0 1-7.08 0L6.46 29.04a5 5 0 0 1 0-7.08L21.96 6.46A5 5 0 0 1 25.5 5Z
       M37.6 14a3.6 3.6 0 1 0-7.2 0a3.6 3.6 0 1 0 7.2 0Z"/>
  <rect x="27" y="6.6" width="9" height="2.2" rx="1.1" fill="#ffffff" opacity=".15"/>
  <circle cx="34" cy="14" r="4.3" fill="none" stroke="#f59e0b" stroke-width="1.4" opacity=".55"/>
  <circle cx="44" cy="5" r="3" fill="#f59e0b"/>
  <circle cx="39.5" cy="2" r="1" fill="#f59e0b" opacity=".55"/>
</svg>`;

const LOGO_MARK_SRC = `data:image/svg+xml;base64,${Buffer.from(LOGO_MARK_SVG).toString("base64")}`;

export function createBrandOgImage() {
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
        <div style={{ display: "flex", alignItems: "center", gap: "48px" }}>
          <img src={LOGO_MARK_SRC} width={220} height={220} alt="" />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", fontSize: "88px", fontWeight: 700, color: "#1c1917" }}>
              Unstash
            </div>
            <div style={{ display: "flex", fontSize: "32px", color: "#78716c" }}>
              Buy, sell, and donate secondhand items in Nigeria
            </div>
          </div>
        </div>
      </div>
    ),
    { ...BRAND_OG_SIZE }
  );
}
