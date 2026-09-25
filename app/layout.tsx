import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { siteUrl, siteName, siteDescription, ogImage } from "@/lib/site";

const shortDescription =
  "IT Repairs & Services - manage sales, repair jobs, inventory, customers, and warranty in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "M-Fixpro",
    "M-Fixpro POS",
    "IT repairs",
    "computer repair shop",
    "point of sale",
    "POS system",
    "repair job management",
    "inventory management",
    "warranty management",
  ],
  applicationName: siteName,
  authors: [{ name: "M-Fixpro" }],
  creator: "M-Fixpro",
  publisher: "M-Fixpro",
  icons: {
    icon: "/shop_logo/1_M.png",
    apple: "/shop_logo/1_M.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    title: siteName,
    description: shortDescription,
    images: [{ ...ogImage, type: "image/jpeg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: shortDescription,
    images: [{ url: ogImage.url, alt: ogImage.alt }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
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
