import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <PlaceholderPage
      title="Terms of Use"
      description="TCM Foundation's terms of use are being finalized and will be published here."
      phase="Awaiting Content"
    />
  );
}
