"use client";

import { TextRouteShell } from "@/components/TextRouteShell";
import { AboutView } from "@/components/views/AboutView";

export default function AboutPage() {
  return (
    <TextRouteShell view="about">
      <AboutView />
    </TextRouteShell>
  );
}
