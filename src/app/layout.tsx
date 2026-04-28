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
  "Karim Boumjimar (b. 1998, Málaga). Ceramics and drawing. Lives between Copenhagen, Stockholm, Berlin and Spain.";
const OG_IMAGE = BASE_PATH + "/og-image.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: [
      { url: BASE_PATH + "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: TITLE,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
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
