import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "News — Karim Boumjimar",
  description:
    "Recent exhibitions, awards, grants, and press for Karim Boumjimar — reverse-chronological listing of solo and group shows, scholarships, and editorial features.",
  pathname: "/news",
});

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
