import type { Metadata } from "next";
import { Raleway, Geist_Mono, DM_Serif_Display } from "next/font/google";
import { Providers } from "./providers";
import { NavbarWrapper } from "@/components/layout/NavbarWrapper";
import { FooterWrapper } from "@/components/layout/FooterWrapper";
import { Toaster } from "sonner";
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
  title: "declut",
  description: "Nigeria's marketplace for things that deserve a second home",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
        <Providers>
          <NavbarWrapper />
          {children}
          <FooterWrapper />
        </Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
