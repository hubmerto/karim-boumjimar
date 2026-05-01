import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy, Karim Boumjimar",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p className="text-mute">
        This privacy policy explains how personal data is handled on
        karimboumjimar.com in accordance with Regulation (EU) 2016/679 (General
        Data Protection Regulation, GDPR) and the Danish Data Protection Act
        (databeskyttelsesloven).
      </p>

      <Section heading="Data controller">
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
          Email:{""}
          <a
            className="underline-offset-2 hover:underline"
            href="mailto:karim@karimboumjimar.com"
          >
            karim@karimboumjimar.com
          </a>
          <br />
          Phone: +45 53 65 33 56
        </p>
      </Section>

      <Section heading="Scope of data processing">
        <p>
          This is a static website with no user accounts, no comments, no
          contact forms, and no analytics or tracking services. The site does
          not set cookies and does not embed third-party scripts that profile
          visitors.
        </p>
        <p>The only personal data that may be processed are:</p>
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            <strong>Server log data</strong> collected by the hosting provider
            when you request a page (IP address, user agent, referrer, request
            time). This data is processed by the hosting provider for the
            technical delivery and security of the site (Article 6 (1) (f) GDPR,
            legitimate interest in operating the website). The site is hosted on
            GitHub Pages (GitHub, Inc., 88 Colin P. Kelly Jr. Street, San
            Francisco, California 94107, USA); see{""}
            <a
              className="underline-offset-2 hover:underline"
              href="https://github.com/site/privacy"
              rel="noopener noreferrer"
              target="_blank"
            >
              github.com/site/privacy
            </a>
            {""}
            for their policy.
          </li>
          <li>
            <strong>Email correspondence</strong>: if you choose to contact the
            data controller using the email address listed above, your message
            and contact details are processed for the purpose of responding to
            your enquiry (Article 6 (1) (b) and (f) GDPR). Messages are retained
            only as long as necessary to fulfil the purpose of the
            correspondence.
          </li>
        </ol>
      </Section>

      <Section heading="Recipients">
        <p>
          Personal data is not transferred to third parties beyond the hosting
          provider described above. Data may be transferred to a third country
          (USA) as part of the technical operation of GitHub Pages. GitHub
          operates under the EU-U.S. Data Privacy Framework.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>Under the GDPR you have the right to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            request access to the personal data processed about you (Art. 15)
          </li>
          <li>request rectification of inaccurate data (Art. 16)</li>
          <li>request erasure of your data (Art. 17)</li>
          <li>request restriction of processing (Art. 18)</li>
          <li>data portability (Art. 20)</li>
          <li>object to processing based on legitimate interests (Art. 21)</li>
          <li>
            withdraw any consent given at any time, without affecting the
            lawfulness of prior processing (Art. 7 (3))
          </li>
        </ul>
        <p>
          To exercise any of these rights, contact the data controller using the
          details above.
        </p>
        <p>
          You also have the right to lodge a complaint with a supervisory
          authority. The competent authority in Denmark is:
        </p>
        <p>
          Datatilsynet
          <br />
          Carl Jacobsens Vej 35
          <br />
          2500 Valby
          <br />
          Denmark
          <br />
          <a
            className="underline-offset-2 hover:underline"
            href="mailto:dt@datatilsynet.dk"
          >
            dt@datatilsynet.dk
          </a>
          <br />
          <a
            className="underline-offset-2 hover:underline"
            href="https://datatilsynet.dk"
            rel="noopener noreferrer"
            target="_blank"
          >
            datatilsynet.dk
          </a>
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          This policy may be updated to reflect changes in the website or
          applicable law. The current version is always available at this URL.
        </p>
        <p className="text-mute">Last updated: 28 April 2026.</p>
      </Section>
    </LegalPage>
  );
}
