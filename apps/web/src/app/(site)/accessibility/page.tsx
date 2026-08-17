import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "Accessibility" };

export default function AccessibilityPage() {
  return (
    <PlaceholderPage
      title="Accessibility"
      description="TCM Foundation's accessibility statement is being finalized and will be published here."
      phase="Awaiting Content"
    />
  );
}
