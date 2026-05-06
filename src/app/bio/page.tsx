"use client";

import { TextRouteShell } from "@/components/TextRouteShell";
import { BioView } from "@/components/views/BioView";

export default function BioPage() {
  return (
    <TextRouteShell view="bio">
      <BioView />
    </TextRouteShell>
  );
}
