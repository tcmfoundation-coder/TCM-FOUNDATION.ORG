import type { Metadata } from "next";
import { LegalPage, LegalSection, LegalList, Placeholder } from "@/components/content/legal-page";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Accessibility Statement",
  description: "TCM Foundation's commitment to making its website accessible and usable by as many people as possible.",
  path: "/accessibility",
});

export default function AccessibilityPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Accessibility Statement"
      lastUpdated={<Placeholder>[Insert Date]</Placeholder>}
      intro={
        <p>
          TCM Foundation is committed to making its website accessible and usable by as many people as possible,
          including people with disabilities. We aim to provide a website that is clear, accessible and easy to
          navigate across different devices and assistive technologies.
        </p>
      }
    >
      <LegalSection number="2.1" heading="Our Accessibility Commitment">
        <p>We work to improve accessibility through practices such as:</p>
        <LegalList
          items={[
            "Clear and consistent navigation",
            "Appropriate heading structure",
            "Descriptive links and buttons",
            "Alternative text for meaningful images",
            "Keyboard-accessible interactions",
            "Readable typography and sufficient visual contrast",
            "Responsive design for different screen sizes",
            "Accessible forms and error messages",
            "Avoiding unnecessary animation or distracting interface elements",
          ]}
        />
        <p>
          We aim to follow recognized accessibility principles, including the Web Content Accessibility Guidelines
          (WCAG), where reasonably practicable.
        </p>
      </LegalSection>

      <LegalSection number="2.2" heading="Continuous Improvement">
        <p>Accessibility is an ongoing process.</p>
        <p>We regularly review and improve the website as new content, features and technologies are introduced.</p>
        <p>
          Some third-party content or services may not be fully controlled by TCM. Where possible, we will work to
          identify and address accessibility issues affecting the overall user experience.
        </p>
      </LegalSection>

      <LegalSection number="2.3" heading="Feedback and Assistance">
        <p>If you experience difficulty accessing any part of our website, please let us know.</p>
        <p>When contacting us, please provide:</p>
        <LegalList
          items={[
            "The page or feature you were trying to access",
            "A description of the accessibility issue",
            "The device or assistive technology you were using, if relevant",
          ]}
        />
        <p>We will make reasonable efforts to assist you and improve the accessibility of the affected content.</p>
        <p>
          Contact — Email: <Placeholder>[Insert Official Email]</Placeholder>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
