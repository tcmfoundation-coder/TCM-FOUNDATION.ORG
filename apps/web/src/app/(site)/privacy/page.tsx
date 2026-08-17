import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <PlaceholderPage
      title="Privacy Policy"
      description="TCM Foundation's privacy policy is being finalized and will be published here."
      phase="Awaiting Content"
    />
  );
}
