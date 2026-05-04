"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";

const HIDDEN_PREFIXES = ["/dashboard", "/auth"];

export function NavbarWrapper() {
  const pathname = usePathname();
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;
  return <Navbar />;
}
