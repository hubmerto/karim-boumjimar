import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Working-Class Creative Grant — Karim Boumjimar",
  description:
    "A 500 EUR no-strings grant awarded throughout the year to a different working-class creative anywhere in the world, funded through art sales. Rolling applications.",
  pathname: "/grant",
});

export default function GrantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
