import { Hero } from "@/components/home/hero";
import { Mission } from "@/components/home/mission";
import { Impact } from "@/components/home/impact";
import { ProgramsPreview } from "@/components/home/programs-preview";
import { LearningHubPromo } from "@/components/home/learning-hub-promo";
import { FeaturedStory } from "@/components/home/featured-story";
import { GetInvolvedBand } from "@/components/home/get-involved-band";
import { Partners } from "@/components/home/partners";
import { ResourcesPreview } from "@/components/home/resources-preview";
import { NewsletterSection } from "@/components/home/newsletter-section";
import { getOrganizationJsonLd } from "@/lib/organization-json-ld";

export default async function HomePage() {
  const organizationJsonLd = await getOrganizationJsonLd();

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <Hero />
      <Mission />
      <Impact />
      <ProgramsPreview />
      <LearningHubPromo />
      <FeaturedStory />
      <GetInvolvedBand />
      <Partners />
      <ResourcesPreview />
      <NewsletterSection />
    </main>
  );
}
