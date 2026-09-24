import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";

const siteUrl = "https://nexora-pos.vercel.app";
const ogImage = "/shop_logo/og.jpeg";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "M-Fixpro POS",
    template: "%s | M-Fixpro POS",
  },
  description:
    "M-Fixpro POS is a point of sale system built for computer and accessories stores, covering sales, inventory, customers, and warranty management.",
  keywords: [
    "M-Fixpro POS",
    "point of sale",
    "POS system",
    "computer store POS",
    "inventory management",
    "sales management",
    "warranty management",
  ],
  applicationName: "M-Fixpro POS",
  authors: [{ name: "M-Fixpro" }],
  icons: {
    icon: "/shop_logo/1_M.png",
    apple: "/shop_logo/1_M.png",
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "M-Fixpro POS",
    title: "M-Fixpro POS",
    description:
      "Point of Sale System for Computer & Accessories - manage sales, inventory, customers, and warranty in one place.",
    images: [
      {
        url: ogImage,
        width: 890,
        height: 1008,
        alt: "M-Fixpro POS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "M-Fixpro POS",
    description:
      "Point of Sale System for Computer & Accessories — manage sales, inventory, customers, and warranty in one place.",
    images: [ogImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
