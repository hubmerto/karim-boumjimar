"use client";

import { JsonLd } from "@/components/JsonLd";
import { TextRouteShell } from "@/components/TextRouteShell";
import { AboutView } from "@/components/views/AboutView";
import { PERSON_JSONLD } from "@/lib/person-jsonld";

export default function AboutPage() {
  return (
    <TextRouteShell view="about">
      <AboutView />
      {/* Person JSON-LD — also lives on the home page; both pages
          declare the same entity so Google's entity reconciliation
          treats karimboumjimar.com as one consistent source for the
          artist. SSR-rendered into the initial HTML. */}
      <JsonLd data={PERSON_JSONLD} />
    </TextRouteShell>
  );
}
