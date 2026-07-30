import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display, Bebas_Neue, Noto_Sans_KR } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SITE } from "@/lib/site";

// Primary sans — replaces Inter; PJS 700/800 visually matches Korean glyph weight much better
const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-inter",   // keep var name so globals.css --font-sans picks it up
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
});

// 네이버 서치어드바이저(searchadvisor.naver.com) 소유 확인 코드.
// 사이트 등록 → HTML 태그 방식 선택 후 content 값을 여기에 붙여넣으면 적용됩니다.
const NAVER_SITE_VERIFICATION: string = "";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: ['유튜브 순위', '유튜버 수익', '떡상 채널', '유튜브 알고리즘', '유튜브 벤치마킹', '유튜브 트렌드', '바이럴 영상'],
  applicationName: SITE.name,
  authors: [{ name: SITE.name }],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: SITE.title,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    locale: SITE.locale,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.title,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'ypjqPrO3UbGyTQ9CCkFz9SARf1bWz8HAn-GdqcNl9Ig',
    ...(NAVER_SITE_VERIFICATION
      ? { other: { 'naver-site-verification': NAVER_SITE_VERIFICATION } }
      : {}),
  },
};

// ── WebSite JSON-LD (구조화 데이터) ──────────────────────────────────────
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  inLanguage: 'ko-KR',
};

const GA_ID = "G-6NS0BQWK70";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={cn(jakartaSans.variable, playfair.variable, bebasNeue.variable, notoSansKr.variable)}>
      <body className="font-sans antialiased text-foreground bg-background">
        {/* WebSite 구조화 데이터 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />

        {/* Google Analytics GA4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>


        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
