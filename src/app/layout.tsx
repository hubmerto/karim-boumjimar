import type { Metadata, Viewport } from "next";
import { Libre_Baskerville } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ContentGuard } from "@/components/ContentGuard";
import { CustomCursor } from "@/components/CustomCursor";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

const libre = Libre_Baskerville({
  variable: "--font-libre",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

// Production lives on Vercel at karimboumjimar.com. The GitHub Pages
// mirror at hubmerto.com/karim-boumjimar/ is kept as a static backup
// but search engines should treat the .com as canonical, so we hard-
// code that as the SITE_URL by default. Override with
// NEXT_PUBLIC_SITE_URL if you ever spin up a different host.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.karimboumjimar.com";
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

// Allow user-zoom (accessibility requirement, also flagged by
// Lighthouse). The canvas's internal pinch-zoom takes priority over
// the browser default while the user is touching the canvas wrapper
// (touch-action:none + custom touch handlers); on text/legal pages
// the browser's native zoom is now available again.
// viewportFit:"cover" lets fixed UI extend under the notch / home
// indicator on modern iPhones.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // Disable iOS auto-linking of dates / numbers / addresses in text.
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
  },
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
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
        {/* Black-ball cursor — tracks the mouse on fine-pointer
            devices, grows on interactive elements. Hidden on
            touch via the component's own pointer:fine guard. */}
        <CustomCursor />
        {/* Block right-click "save image" on img + canvas elements.
            Soft deterrent only — not a real DRM. */}
        <ContentGuard />
        {/* Vercel Web Analytics + Speed Insights — privacy-friendly,
            no cookies, no consent banner needed. Captures pageviews
            and Core Web Vitals to the Vercel dashboard. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
