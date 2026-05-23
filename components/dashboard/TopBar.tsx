"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/listings": "My Listings",
  "/dashboard/listings/new": "New Listing",
  "/dashboard/profile": "Profile",
  "/dashboard/orders": "Orders",
  "/dashboard/billing": "Payouts",
};

function getTitle(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.includes("/edit")) return "Edit Listing";
  return "Dashboard";
}

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-6 lg:px-8 bg-card border-b border-border shrink-0">
      {/* Page title */}
      <h2 className="text-sm font-semibold text-text hidden lg:block">
        {getTitle(pathname)}
      </h2>

      {/* Spacer on mobile (logo is in MobileHeader) */}
      <div className="lg:hidden" />
    </header>
  );
}
