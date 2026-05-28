"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

export function FooterWrapper() {
  const pathname = usePathname();
  const HIDDEN_PREFIXES = ["/dashboard", "/auth", "/login", "/dispatch", "/verify-email", "/admin"]
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  return <Footer />;
}
