"use client";

import { ReactLenis } from "lenis/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { CART_QUERY_KEY } from "@/lib/hooks/useCart";
import { OrdersModalProvider } from "@/lib/context/orders-modal-context";

function CartSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const onUpdate = () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    window.addEventListener("cart-updated", onUpdate);
    return () => window.removeEventListener("cart-updated", onUpdate);
  }, [queryClient]);
  return <>{children}</>;
}

function LenisProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Dashboard uses h-screen overflow-hidden with an inner scrollable container.
  // Lenis attaches to window and intercepts touchpad events, making them no-ops
  // since the document body is not scrollable in that layout.
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/dispatch") || pathname.startsWith("/admin") || pathname.startsWith("/search")) return <>{children}</>;
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
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <QueryClientProvider client={client}>
        <CartSyncProvider>
          <OrdersModalProvider>
            <LenisProvider>{children}</LenisProvider>
          </OrdersModalProvider>
        </CartSyncProvider>
      </QueryClientProvider>
    </APIProvider>
  );
}
