import type { Metadata } from "next";
import { LegalPage, LegalSection, LegalList, Placeholder } from "@/components/content/legal-page";
import { CookieTable } from "@/components/content/cookie-table";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How TCM Foundation collects, uses, and protects your personal information.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated={<Placeholder>[Insert Date]</Placeholder>}
      intro={
        <p>
          TCM Foundation (&ldquo;TCM,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) respects your
          privacy and is committed to protecting the personal information you provide when using our website and
          services. This Privacy Policy explains what information we collect, how we use it, how we protect it, and
          the choices available to you.
        </p>
      }
    >
      <LegalSection number="1.1" heading="Information We Collect">
        <p>Depending on how you interact with our website, we may collect:</p>
        <LegalList
          items={[
            "Name and contact information",
            "Email address",
            "Information submitted through contact forms",
            "Information submitted through program or application forms",
            "Information submitted through Support Lab requests",
            "Newsletter subscription information",
            "Information voluntarily provided through other website forms",
            "Technical information such as browser type, device information, IP address and website usage data",
          ]}
        />
        <p>We only request information that is reasonably necessary for the relevant service or purpose.</p>
      </LegalSection>

      <LegalSection number="1.2" heading="How We Use Your Information">
        <p>We may use information collected to:</p>
        <LegalList
          items={[
            "Respond to enquiries and requests",
            "Process applications and submissions",
            "Provide support through the TCM Support Lab",
            "Send requested communications",
            "Send newsletters where you have subscribed",
            "Improve our programs, services and website",
            "Understand website usage and performance",
            "Maintain website security",
            "Meet legal or administrative obligations",
          ]}
        />
        <p>We do not sell your personal information.</p>
      </LegalSection>

      <LegalSection number="1.3" heading="Cookies and Analytics">
        <p>
          The table below lists the cookies this website sets. Cookies marked{" "}
          <strong>Required</strong> are needed for the site to function and are not covered by the consent choice.
          Cookies marked <strong>Optional</strong> are only set after you select &ldquo;Accept&rdquo; on the cookie
          banner.
        </p>

        <CookieTable />

        <p>
          Google Analytics cookies are set by Google, not by TCM Foundation, and only load once you have accepted.
          If you decline, or have not yet chosen, the Google Analytics script is not loaded and these cookies are
          not created.
        </p>
        <p>
          You can change or withdraw your choice at any time using the <strong>Cookie Settings</strong> link in the
          website footer. Withdrawing your consent clears your recorded choice, stops Google Analytics from loading,
          and removes the homepage experiment cookie. It does not sign you out of the content management system.
        </p>
      </LegalSection>

      <LegalSection number="1.4" heading="Third-Party Services">
        <p>TCM may use trusted third-party services to operate certain website functions, including:</p>
        <LegalList
          items={[
            "Cloudinary for approved media storage and delivery",
            "Google services for authentication and analytics",
            "Email service providers for communications",
            "Hosting and infrastructure providers",
          ]}
        />
        <p>
          These services may process information in accordance with their own privacy policies and applicable
          agreements.
        </p>
      </LegalSection>

      <LegalSection number="1.5" heading="Data Security">
        <p>
          We take reasonable technical and organizational measures to protect personal information against
          unauthorized access, loss, misuse or disclosure.
        </p>
        <p>However, no internet-based system can be guaranteed to be completely secure.</p>
      </LegalSection>

      <LegalSection number="1.6" heading="Data Retention">
        <p>
          We retain personal information only for as long as reasonably necessary for the purpose for which it was
          collected, to provide our services, maintain appropriate records, or comply with applicable legal
          requirements.
        </p>
      </LegalSection>

      <LegalSection number="1.7" heading="Your Rights">
        <p>
          Depending on applicable law, you may have rights concerning your personal information, including the
          right to:
        </p>
        <LegalList
          items={[
            "Request access to your information",
            "Request correction of inaccurate information",
            "Request deletion where legally applicable",
            "Withdraw consent where processing is based on consent",
            "Ask questions about how your information is being used",
          ]}
        />
        <p>To make a privacy-related request, contact us using the details below.</p>
      </LegalSection>

      <LegalSection number="1.8" heading="Children's Privacy">
        <p>
          Our website is not intentionally designed to collect personal information from children without
          appropriate authorization.
        </p>
        <p>
          If you believe a child has provided personal information to us improperly, please contact us so that we
          can review the matter.
        </p>
      </LegalSection>

      <LegalSection number="1.9" heading="Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Any changes will be published on this page with an
          updated revision date.
        </p>
      </LegalSection>

      <LegalSection number="1.10" heading="Contact">
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
