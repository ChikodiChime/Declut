import type { Metadata } from "next";
import { Raleway, Geist_Mono, DM_Serif_Display } from "next/font/google";
import { Providers } from "./providers";
import { NavbarWrapper } from "@/components/layout/NavbarWrapper";
import { FooterWrapper } from "@/components/layout/FooterWrapper";
import { Toaster } from "sonner";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { OrdersDrawer } from "@/components/orders/OrdersDrawer";
import NextTopLoader from "nextjs-toploader";
import Script from "next/script";
import "lenis/dist/lenis.css";
import "./globals.css";

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif-display",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://unstash.xyz";

const SITE_TITLE = "Unstash — The Marketplace for What's Next";
const SITE_DESCRIPTION =
  "Discover pre-loved treasures, sell what no longer serves you, and give generously — all in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_TITLE,
    template: "%s | Unstash",
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: "Unstash",
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${raleway.variable} ${geistMono.variable} ${dmSerifDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Lenis (smooth-scroll) initializes its own scroll state on mount,
            which fights the browser's native scroll-position restoration on
            refresh — that mismatch is what caused the navbar to visibly
            flash between its transparent and solid states. Disabling native
            restoration this early (before hydration) means every reload
            starts clean at the top, so there's nothing for Lenis to fight. */}
        <Script id="disable-scroll-restoration" strategy="beforeInteractive">
          {`try { if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; } } catch (e) {}`}
        </Script>
        <NextTopLoader color="#3730a3" showSpinner={false} />
        <Providers>
          <NavbarWrapper />
          {children}
          <FooterWrapper />
          <ChatBubble />
          <OrdersDrawer />
        </Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
