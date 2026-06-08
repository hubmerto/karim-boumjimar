import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// /contact is a "use client" page so it can't export metadata
// directly. Co-locating a server-only layout.tsx is the simplest path
// to per-route metadata without converting the page or rewriting any
// of the canvas / UI machinery.
//
// Replaced /about when the route was renamed; the description below
// still leads with "Spanish-Moroccan artist (b. 1998, Málaga) …"
// because that's the Person.description string the knowledge panel
// is meant to source. Newsletter signup is part of the page but not
// part of the search-snippet copy.
export const metadata: Metadata = pageMetadata({
  title: "Contact — Karim Boumjimar",
  description:
    "Spanish-Moroccan artist (b. 1998, Málaga) working across drawing, ceramics, and performance. Contact, newsletter sign-up, and direct enquiries.",
  pathname: "/contact",
});

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
