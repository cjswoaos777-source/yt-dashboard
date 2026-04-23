import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display, Bebas_Neue, Noto_Sans_KR } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SmoothScroll } from "@/components/smooth-scroll";

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

export const metadata: Metadata = {
  title: '유튜브 순위 분석 대시보드 - Viral Hunter',
  description: '떡상하는 유튜브 채널 순위, 숏츠와 롱폼 채널의 바이럴 지수를 분석하여 유튜버 성장을 위한 진짜 꿀통 채널을 찾아냅니다.',
  keywords: ['유튜브 순위', '유튜버 수익', '떡상 채널', '유튜브 알고리즘', '유튜브 벤치마킹'],
  openGraph: {
    title: '유튜브 순위 분석 대시보드 - Viral Hunter',
    description: '알고리즘을 타기 시작한 유튜브 채널들의 실시간 랭킹 분석 웹입니다.',
    url: 'https://yt-dashboard-theta.vercel.app',
    siteName: 'Viral Hunter',
    locale: 'ko_KR',
    type: 'website',
  },
  verification: {
    google: 'ypjqPrO3UbGyTQ9CCkFz9SARf1bWz8HAn-GdqcNl9Ig',
  },
  other: {
    'naver-site-verification': '7edc64886461bfa89af80912094c25e8b18ec9d2',
  },
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
