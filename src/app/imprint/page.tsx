import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Imprint, Karim Boumjimar",
};

export default function ImprintPage() {
  return (
    <LegalPage title="Imprint">
      <p className="text-mute">
        Information in accordance with the Danish E-Commerce Act (lov om
        tjenester i informationssamfundet) and Article 5 of Regulation
        (EU) 2022/2065 (Digital Services Act).
      </p>

      <Section heading="Responsible for content">
        <p>
          Karim Boumjimar
          <br />
          Frederikssundsvej 212, t.h.
          <br />
          2700 København
          <br />
          Denmark
        </p>
        <p>
          Phone: +45 53 65 33 56
          <br />
          Email:{" "}
          <a
            className="underline-offset-2 hover:underline"
            href="mailto:karim@karimboumjimar.com"
          >
            karim@karimboumjimar.com
          </a>
          <br />
          Web:{" "}
          <a
            className="underline-offset-2 hover:underline"
            href="https://karimboumjimar.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            karimboumjimar.com
          </a>
        </p>
      </Section>

      <Section heading="Website design and development">
        <p>
          Designed and developed by Humberto Gesser.
          <br />
          Web:{" "}
          <a
            className="underline-offset-2 hover:underline"
            href="https://hubmerto.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            hubmerto.com
          </a>
        </p>
      </Section>

      <Section heading="Liability for content">
        <p>
          The content of this website has been prepared with care.
          However, no liability can be assumed for the accuracy,
          completeness, or timeliness of the content. As the service
          provider, Karim Boumjimar is responsible for own content on
          these pages in accordance with general law. We are not obliged
          to monitor transmitted or stored third-party information, or to
          investigate circumstances that indicate illegal activity.
          Obligations to remove or block the use of information under
          general law remain unaffected. Liability in this respect is
          only possible from the point in time at which a concrete
          infringement of the law becomes known. Upon notification of
          corresponding infringements, this content will be removed
          immediately.
        </p>
      </Section>

      <Section heading="Liability for links">
        <p>
          This website contains links to external websites operated by
          third parties, over whose content we have no control. We
          therefore cannot accept any liability for this third-party
          content. The respective provider or operator of the linked
          pages is always responsible for the content of the linked
          pages. The linked pages were checked for possible legal
          violations at the time of linking. Illegal content was not
          recognisable at the time of linking. Permanent monitoring of
          the content of linked pages is not reasonable without concrete
          evidence of a legal violation. If we become aware of any
          infringements, we will remove such links immediately.
        </p>
      </Section>

      <Section heading="Copyright">
        <p>
          All artworks, images, and texts published on this website are
          subject to copyright. Any reproduction, distribution, or public
          display requires the prior written consent of the author.
          Downloads and copies of this site are only permitted for
          private, non-commercial use.
        </p>
      </Section>
    </LegalPage>
  );
}
