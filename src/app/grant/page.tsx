"use client";

import { TextRouteShell } from "@/components/TextRouteShell";
import { GrantView } from "@/components/views/GrantView";

export default function GrantPage() {
  return (
    <TextRouteShell view="grant">
      <GrantView />
    </TextRouteShell>
  );
}
