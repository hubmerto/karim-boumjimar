import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Bio — Karim Boumjimar",
  description:
    "CV-style biography: MFA Royal Danish Academy of Fine Arts (2025), BFA Central Saint Martins. Selected solo exhibitions, public collections, and recognition.",
  pathname: "/bio",
});

export default function BioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
