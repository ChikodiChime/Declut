import type { Metadata } from "next";
import { Raleway, Geist_Mono, DM_Serif_Display } from "next/font/google";
import { Providers } from "./providers";
import { NavbarWrapper } from "@/components/layout/NavbarWrapper";
import { FooterWrapper } from "@/components/layout/FooterWrapper";
import { Toaster } from "sonner";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { OrdersDrawer } from "@/components/orders/OrdersDrawer";
import NextTopLoader from "nextjs-toploader";
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

export const metadata: Metadata = {
  title: {
    default: "Declutter Marketplace",
    template: "%s | Declutter",
  },
  description: "Buy, sell, and donate secondhand items in Nigeria.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Declutter Marketplace",
    description: "Buy, sell, and donate secondhand items in Nigeria.",
    siteName: "Declutter Marketplace",
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Declutter Marketplace",
    description: "Buy, sell, and donate secondhand items in Nigeria.",
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
