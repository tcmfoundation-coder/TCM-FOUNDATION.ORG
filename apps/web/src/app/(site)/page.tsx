import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { Mission } from "@/components/home/mission";
import { Impact } from "@/components/home/impact";
import { ProgramsPreview } from "@/components/home/programs-preview";
import { FeaturedStory } from "@/components/home/featured-story";
import { CallForApplicationsPreview } from "@/components/home/call-for-applications-preview";
import { GetInvolvedBand } from "@/components/home/get-involved-band";
import { ExternalResources } from "@/components/home/external-resources";
import { ResourcesPreview } from "@/components/home/resources-preview";
import { Partners } from "@/components/home/partners";
import { NewsletterSection } from "@/components/home/newsletter-section";
import { getOrganizationJsonLd, serializeJsonLd } from "@/lib/organization-json-ld";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "TCM Foundation",
  description: "The Corporate Muslimah Foundation — empowering Muslim women to lead, grow, and thrive in the corporate world.",
  path: "/",
  absoluteTitle: true,
});

// Section order follows the intended homepage communication flow: identity
// (Hero, Mission) -> proof (Impact) -> what TCM does (Programs, Spotlight
// story) -> something to act on now (Call for Applications, when open) ->
// how to engage (Get Involved, TCM TV/Learning Hub) -> ongoing content
// (Resources) -> social proof (Partners) -> conversion (Newsletter).
export default async function HomePage() {
  const organizationJsonLd = await getOrganizationJsonLd();

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd) }} />
      <Hero />
      <Mission />
      <Impact />
      <ProgramsPreview />
      <FeaturedStory />
      {/* Renders nothing when no campaign is open, so the homepage closes up
          around it rather than showing an empty promotional block. */}
      <CallForApplicationsPreview />
      <GetInvolvedBand />
      <ExternalResources />
      <ResourcesPreview />
      <Partners />
      <NewsletterSection />
    </main>
  );
}
