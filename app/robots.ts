import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Everything behind login is private; only the landing and login pages are public.
const privateRoutes = [
  "/api",
  "/audit-log",
  "/bills",
  "/brands",
  "/categories",
  "/customers",
  "/dashboard",
  "/finance",
  "/grn",
  "/jobs",
  "/products",
  "/profile",
  "/quotations",
  "/salary",
  "/sales",
  "/settings",
  "/stock-movements",
  "/stock-out",
  "/stock-transfer",
  "/suppliers",
  "/warranty",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: privateRoutes,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
