import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// /about is a "use client" page so it can't export metadata directly.
// Co-locating a server-only layout.tsx is the simplest path to per-
// route metadata without converting the page or rewriting any of the
// canvas/UI machinery.
export const metadata: Metadata = pageMetadata({
  title: "About — Karim Boumjimar",
  description:
    "Spanish-Moroccan artist (b. 1998, Málaga) working across drawing, ceramics, and performance. Examines social hierarchies through the entanglement of nature, body, and identity.",
  pathname: "/about",
});

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
