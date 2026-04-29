import type { Metadata } from "next";
import { Libre_Baskerville } from "next/font/google";
import "./globals.css";

const libre = Libre_Baskerville({
  variable: "--font-libre",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const SITE_URL = "https://hubmerto.com" + BASE_PATH;
const TITLE = "Karim Boumjimar";
const DESCRIPTION =
  "Examining social hierarchies through hybrid bodies, mythology, and ecology. Selected projects, writing, and exhibitions.";
// metadataBase already includes BASE_PATH, so image paths must be
// site-root-relative; otherwise Next.js joins the prefix twice.
// Three variants of the same source image (no distortion, letterboxed
// where needed) so different social platforms each get a fitting card.
const OG_IMAGES = [
  // Horizontal hero, used by Twitter / Facebook / Slack / Discord large card.
  { url: "/og-image.png", width: 1200, height: 630 },
  // 4:3 fallback some clients prefer (LinkedIn / certain WhatsApp paths).
  { url: "/og-image-4x3.png", width: 1200, height: 900 },
  // Square for iMessage tiny thumbs and platforms that re-crop to 1:1.
  { url: "/og-image-square.png", width: 1200, height: 1200 },
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // Favicon is auto-discovered from src/app/icon.svg, so basePath is
  // applied correctly without us configuring icons here.
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: TITLE,
    images: OG_IMAGES.map((i) => ({ ...i, alt: TITLE })),
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: OG_IMAGES.map((i) => i.url),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={libre.variable}>
      <body>{children}</body>
    </html>
  );
}
