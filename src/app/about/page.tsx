"use client";

import { JsonLd } from "@/components/JsonLd";
import { TextRouteShell } from "@/components/TextRouteShell";
import { AboutView } from "@/components/views/AboutView";
import { ABOUT_PROFILEPAGE_JSONLD } from "@/lib/about-profilepage-jsonld";
import { PERSON_JSONLD } from "@/lib/person-jsonld";

export default function AboutPage() {
  return (
    <TextRouteShell view="about">
      <AboutView />
      {/* Person JSON-LD — same @id as the home page's Person blob, so
          Google's entity reconciliation treats karimboumjimar.com as
          one consistent source for the artist. ProfilePage references
          this Person via @id rather than duplicating the object. Both
          blobs SSR into the initial HTML (Next renders client trees
          server-side during SSG). */}
      <JsonLd data={PERSON_JSONLD} />
      {/* ProfilePage — declares /about as the entity-home profile
          surface for the referenced Person. Stronger entity-home
          signal than a free-standing Person blob; targets the
          specific issue that the knowledge panel currently sources
          its description from a gallery site instead of this one. */}
      <JsonLd data={ABOUT_PROFILEPAGE_JSONLD} />
    </TextRouteShell>
  );
}
