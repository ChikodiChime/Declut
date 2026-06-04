const BASE = "#ede9e2";
const LIGHT = "#f5f2ee";

interface BrowseCardSkeletonProps {
  index?: number;
}

export function BrowseCardSkeleton({ index = 0 }: BrowseCardSkeletonProps) {
  const delay = `${(index % 4) * 0.12}s`;

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white"
      style={{
        border: "1px solid #e8e4dc",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      {/* Shimmer sweep */}
      <div className="skeleton-shimmer" style={{ animationDelay: delay }} />

      {/* Image block */}
      <div
        className="relative aspect-4/3 rounded-t-2xl"
        style={{ background: LIGHT }}
      >
        {/* Type badge placeholder */}
        <div
          className="absolute left-2.5 top-2.5 h-5 w-14 rounded-full"
          style={{ background: BASE }}
        />
        {/* Action button placeholder */}
        <div
          className="absolute right-2.5 top-2.5 h-9 w-9 rounded-full"
          style={{ background: BASE }}
        />
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-2.5 p-3.5">
        {/* Price */}
        <div className="h-5 w-24 rounded" style={{ background: BASE }} />

        {/* Title */}
        <div className="h-3.5 w-4/5 rounded" style={{ background: LIGHT }} />

        {/* Meta row: condition pill + dot + location */}
        <div className="flex items-center gap-1.5">
          <div
            className="h-4 w-16 rounded-full"
            style={{ background: LIGHT }}
          />
          <div
            className="h-1 w-1 rounded-full"
            style={{ background: BASE }}
          />
          <div className="h-3 w-20 rounded" style={{ background: LIGHT }} />
        </div>
      </div>
    </div>
  );
}
