"use client";

import { JsonLd } from "@/components/JsonLd";
import { TextRouteShell } from "@/components/TextRouteShell";
import { ContactView } from "@/components/views/ContactView";
import { CONTACT_PROFILEPAGE_JSONLD } from "@/lib/contact-profilepage-jsonld";
import { PERSON_JSONLD } from "@/lib/person-jsonld";

export default function ContactPage() {
  return (
    <TextRouteShell view="contact">
      <ContactView />
      {/* Person JSON-LD — same @id as the home page's Person blob, so
          Google's entity reconciliation treats karimboumjimar.com as
          one consistent source for the artist. ProfilePage references
          this Person via @id rather than duplicating the object. Both
          blobs SSR into the initial HTML (Next renders client trees
          server-side during SSG). */}
      <JsonLd data={PERSON_JSONLD} />
      {/* ProfilePage — declares /contact as the entity-home profile
          surface for the referenced Person. Stronger entity-home
          signal than a free-standing Person blob; the previous /about
          ProfilePage was renamed alongside the route. */}
      <JsonLd data={CONTACT_PROFILEPAGE_JSONLD} />
    </TextRouteShell>
  );
}
