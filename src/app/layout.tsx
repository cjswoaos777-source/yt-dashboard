import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display, Bebas_Neue, Noto_Sans_KR } from "next/font/google";
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
  title: "유튜브 떡상 발굴기",
  description: "조회수 대비 반응이 폭발적인 영상을 실시간으로 포착합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={cn(jakartaSans.variable, playfair.variable, bebasNeue.variable, notoSansKr.variable)}>
      <body className="font-sans antialiased text-foreground bg-background">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
