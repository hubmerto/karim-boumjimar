"use client";

import { TextRouteShell } from "@/components/TextRouteShell";
import { NewsView } from "@/components/views/NewsView";

export default function NewsPage() {
  return (
    <TextRouteShell view="news">
      <NewsView />
    </TextRouteShell>
  );
}
