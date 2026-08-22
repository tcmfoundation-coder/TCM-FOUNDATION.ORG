import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/analytics";
import { SITE_URL } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial display/heading face — premium and distinctive without being
// ornate, paired with Geist Sans for highly readable body copy.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

// Arabic accent face. Naskh-inspired and editorial rather than an ornate
// calligraphic display font, and — critically — it renders tashkeel
// (the vowel marks in تَعَارَفُوا) correctly, which many Latin-first fallbacks
// drop or misplace. Loaded only for the small number of Arabic accents on the
// site.
const notoNaskhArabic = Noto_Naskh_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TCM Foundation",
    template: "%s | TCM Foundation",
  },
  description: "The Corporate Muslimah Foundation — official website.",
  openGraph: {
    siteName: "TCM Foundation",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${notoNaskhArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
