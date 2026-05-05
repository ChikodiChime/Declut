"use client";

import { ReactLenis } from "lenis/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState } from "react";

function LenisProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Dashboard uses h-screen overflow-hidden with an inner scrollable container.
  // Lenis attaches to window and intercepts touchpad events, making them no-ops
  // since the document body is not scrollable in that layout.
  if (pathname.startsWith("/dashboard")) return <>{children}</>;
  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.2 }}>
      {children}
    </ReactLenis>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: { networkMode: "always" },
          queries: { networkMode: "always" },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <LenisProvider>{children}</LenisProvider>
    </QueryClientProvider>
  );
}
