import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Showcase · Dispersion — Karim Boumjimar",
};

export default function L({ children }: { children: React.ReactNode }) {
  return children;
}
