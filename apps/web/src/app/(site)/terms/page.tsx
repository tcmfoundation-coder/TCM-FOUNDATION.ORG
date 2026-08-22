import type { Metadata } from "next";
import { LegalPage, LegalSection, LegalList, Placeholder } from "@/components/content/legal-page";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms & Conditions",
  description: "The terms and conditions governing use of the TCM Foundation website.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms & Conditions"
      lastUpdated={<Placeholder>[Insert Date]</Placeholder>}
      intro={
        <p>
          Welcome to the TCM Foundation website. By accessing or using this website, you agree to comply with these
          Terms &amp; Conditions. If you do not agree with these terms, please do not use the website.
        </p>
      }
    >
      <LegalSection number="3.1" heading="About the Website">
        <p>
          The TCM Foundation website provides information about our organization, programs, initiatives,
          opportunities, resources and related activities.
        </p>
        <p>The information provided on the website is intended primarily for general informational purposes.</p>
      </LegalSection>

      <LegalSection number="3.2" heading="Acceptable Use">
        <p>You agree to use the website responsibly and lawfully. You must not:</p>
        <LegalList
          items={[
            "Use the website for unlawful purposes",
            "Attempt to gain unauthorized access to the website or its systems",
            "Interfere with website security or functionality",
            "Upload malicious code or harmful files",
            "Misuse application, contact or support forms",
            "Submit information that is intentionally false or misleading",
            "Copy or use website content in a way that infringes applicable rights",
          ]}
        />
      </LegalSection>

      <LegalSection number="3.3" heading="Applications and Submissions">
        <p>
          Where the website provides applications, enquiries, support requests or other submission forms, you are
          responsible for providing information that is accurate and complete to the best of your knowledge.
        </p>
        <p>
          Submitting an application or request does not automatically guarantee acceptance, funding, participation,
          employment, support or any other outcome.
        </p>
        <p>TCM reserves the right to review submissions according to the applicable program or initiative requirements.</p>
      </LegalSection>

      <LegalSection number="3.4" heading="Intellectual Property">
        <p>
          Unless otherwise indicated, the website&rsquo;s content, including text, graphics, branding, logos,
          photographs, videos, designs and other materials, belongs to TCM Foundation or is used with appropriate
          permission.
        </p>
        <p>You may view and use the website for lawful personal or informational purposes.</p>
        <p>
          You may not reproduce, modify, distribute or commercially exploit protected content without appropriate
          authorization.
        </p>
      </LegalSection>

      <LegalSection number="3.5" heading="Third-Party Links">
        <p>
          The website may contain links to third-party websites or services, including social-media platforms and
          external resources.
        </p>
        <p>These websites are operated independently from TCM.</p>
        <p>TCM is not responsible for their content, availability, privacy practices or terms.</p>
        <p>You should review the terms and privacy policies of third-party websites before using them.</p>
      </LegalSection>

      <LegalSection number="3.6" heading="Website Availability">
        <p>
          We aim to keep the website available and reliable, but we cannot guarantee that it will always be
          uninterrupted, error-free or available.
        </p>
        <p>
          We may temporarily suspend or modify website services for maintenance, security, upgrades or other
          operational reasons.
        </p>
      </LegalSection>

      <LegalSection number="3.7" heading="Accuracy of Information">
        <p>We make reasonable efforts to provide accurate and current information.</p>
        <p>
          However, information may change over time, and we do not guarantee that every piece of information on the
          website will always be complete, current or error-free.
        </p>
      </LegalSection>

      <LegalSection number="3.8" heading="Limitation of Liability">
        <p>
          To the extent permitted by applicable law, TCM Foundation will not be responsible for losses or damages
          arising from your use of, or inability to use, the website or third-party websites linked from it.
        </p>
        <p>
          Nothing in these Terms &amp; Conditions is intended to exclude or limit liability where such exclusion or
          limitation is not permitted by law.
        </p>
      </LegalSection>

      <LegalSection number="3.9" heading="Changes to These Terms">
        <p>We may update these Terms &amp; Conditions from time to time.</p>
        <p>Updated terms will be published on this page with a revised date.</p>
        <p>
          Your continued use of the website after an update constitutes acceptance of the revised terms to the
          extent permitted by applicable law.
        </p>
      </LegalSection>

      <LegalSection number="3.10" heading="Governing Law">
        <p>These Terms &amp; Conditions shall be interpreted in accordance with the applicable laws of:</p>
        <p>
          <Placeholder>[Insert Jurisdiction]</Placeholder>
        </p>
      </LegalSection>

      <LegalSection number="3.11" heading="Contact">
        <p>TCM Foundation</p>
        <p>
          Email: <Placeholder>[Insert Official Email]</Placeholder>
        </p>
        <p>
          Address: <Placeholder>[Insert Official Address]</Placeholder>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
