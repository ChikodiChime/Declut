"use client";

import { CldImage, type CldImageProps } from "next-cloudinary";

type Props = Omit<CldImageProps, "src"> & { src: string };

/**
 * Renders a Cloudinary image for production assets (public_id),
 * or a plain <img> for external URLs stored via seed data.
 */
export function ListingImage({ src, fill, className, sizes, alt, ...rest }: Props) {
  if (src.startsWith("http")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={
          fill
            ? ["absolute inset-0 w-full h-full", className].filter(Boolean).join(" ")
            : className
        }
      />
    );
  }
  return (
    <CldImage
      src={src}
      fill={fill}
      className={className}
      sizes={sizes}
      alt={alt}
      {...rest}
    />
  );
}
