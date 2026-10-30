import type { Metadata } from "next";
import { Bebas_Neue } from "next/font/google";
import Script from "next/script";
// [2026-10-30 새 디자인] 한글 글꼴은 Pretendard 하나로 통일한다. 페이지에 쓰인 글자 조각만 받는
// 동적 서브셋을 사이트 안에서 직접 내보낸다(외부 CDN 없음). 예전 Plus Jakarta·Playfair·Noto 는 뺐고,
// 그 변수(--font-inter·--font-playfair·--font-noto)는 vh.css 가 Pretendard 로 돌린다.
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import "./vh.css";
import { SmoothScroll } from "@/components/smooth-scroll";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooterNew } from "@/components/site/site-footer";
import { SITE } from "@/lib/site";

// 순위 숫자(B 시안의 굵은 숫자)에만 쓴다.
const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// 네이버 서치어드바이저(searchadvisor.naver.com) 소유 확인 코드.
// 사이트 등록 → HTML 태그 방식 선택 후 content 값을 여기에 붙여넣으면 적용됩니다.
// [2026-10-16] trend.readthe1stars.com 으로 등록. (예전 yt-viralhunter.vercel.app 등록은 별개)
const NAVER_SITE_VERIFICATION: string = "1b3491bc3f86e7e83c6f56ce3cfe7f66cc9248b7";

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
    <html lang="ko" className={bebasNeue.variable}>
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
            gtag('config', '${GA_ID}', { send_page_view: false });
          `}
        </Script>
        {/* page_view(page_type 포함)와 유튜브·채널 클릭은 이 추적기가 보낸다 */}
        <AnalyticsTracker />


        <SmoothScroll>
          {/* 모든 화면 공통 머리·바닥글 (예전 사이드바와 화면마다 붙던 SiteFooter 를 대신한다) */}
          <SiteHeader />
          {children}
          <SiteFooterNew />
        </SmoothScroll>
      </body>
    </html>
  );
}
