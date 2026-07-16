import { createBrandOgImage, BRAND_OG_SIZE } from "@/lib/og/brand-image";

export const alt = "Unstash Marketplace";
export const size = BRAND_OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return createBrandOgImage();
}
