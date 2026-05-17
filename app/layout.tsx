import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://rivers-of-language.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Rivers of Language · 语言之河 — Interactive Map of World Language Evolution",
  description:
    "Interactive visualization of how the 7 major language families (Indo-European, Sino-Tibetan, Afro-Asiatic, Niger-Congo, Austronesian, Dravidian, Turkic) evolved over 8000 years. 200+ languages, etymology chains, script evolution. 交互式世界语言演变图：印欧、汉藏、闪含七大语系 8000 年。",
  keywords: [
    "language family tree",
    "language evolution",
    "historical linguistics",
    "Proto-Indo-European",
    "etymology visualization",
    "Sino-Tibetan languages",
    "Indo-European family",
    "language phylogeny",
    "phylogenetic linguistics",
    "linguistic atlas",
    "world languages",
    "interactive linguistics",
    "Glottolog",
    "ancient languages",
    "Old Chinese",
    "Middle Chinese",
    "Latin descendants",
    "Romance languages",
    "language tree visualization",
    "language history",
    "comparative linguistics",
    "writing system evolution",
    "cuneiform alphabet",
    "language map",
    "语言之河",
    "语言演变",
    "印欧语系",
    "汉藏语系",
    "语言家族树",
    "语言学",
  ],
  authors: [{ name: "Lei Huo", url: "https://github.com/huodebing-alt" }],
  creator: "Lei Huo",
  publisher: "Rivers of Language",
  category: "education",
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["zh_CN"],
    url: SITE_URL,
    siteName: "Rivers of Language · 语言之河",
    title: "Rivers of Language — Interactive Map of World Language Evolution",
    description:
      "An 8000-year interactive visualization of how the world's 7 major language families branched, merged, and flowed. 200+ languages, etymology chains, script evolution.",
    images: [
      {
        url: "/og-image.png",
        width: 1600,
        height: 900,
        alt: "Rivers of Language — 7 language families flow across 8000 years",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rivers of Language · 语言之河",
    description:
      "Interactive map of how the world's languages evolved over 8000 years. Indo-European · Sino-Tibetan · Afro-Asiatic · Niger-Congo · Austronesian · Dravidian · Turkic.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      "en-US": SITE_URL,
      "zh-CN": SITE_URL,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["WebApplication", "Dataset", "EducationalResource"],
  name: "Rivers of Language",
  alternateName: ["语言之河", "Language Family Tree Visualization"],
  description:
    "An interactive visualization of how the world's 7 major language families (Indo-European, Sino-Tibetan, Afro-Asiatic, Niger-Congo, Austronesian, Dravidian, Turkic) evolved over 8000 years, with 200+ languages, etymology chains, and writing system evolution.",
  url: SITE_URL,
  author: {
    "@type": "Person",
    name: "Lei Huo",
    url: "https://github.com/huodebing-alt",
  },
  applicationCategory: "EducationalApplication",
  educationalUse: ["Reference", "Self-study"],
  about: [
    { "@type": "Thing", name: "Historical Linguistics" },
    { "@type": "Thing", name: "Language Family" },
    { "@type": "Thing", name: "Proto-Indo-European" },
    { "@type": "Thing", name: "Etymology" },
    { "@type": "Thing", name: "Phylogenetic Linguistics" },
  ],
  keywords:
    "language family tree, historical linguistics, Proto-Indo-European, Sino-Tibetan, etymology, language evolution, phylogenetic linguistics, Glottolog, world languages",
  inLanguage: ["en", "zh"],
  license: "https://opensource.org/licenses/MIT",
  isAccessibleForFree: true,
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
