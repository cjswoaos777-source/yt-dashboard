"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ArrowRight, TrendingUp, Target, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const badgeRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subCopyRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.from(badgeRef.current, { opacity: 0, y: 20, duration: 0.6 })
      .from(headlineRef.current, { opacity: 0, y: 40, duration: 0.9 }, "-=0.2")
      .from(subCopyRef.current, { opacity: 0, y: 30, duration: 0.7 }, "-=0.2")
      .from(ctaRef.current, { opacity: 0, y: 20, duration: 0.6 }, "-=0.2");
  }, []);

  return (
    <main className="bg-[#FDFDFC] text-[#1A1A1A]">

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center min-h-screen px-6 py-32 text-center">

        {/* Badge */}
        <div
          ref={badgeRef}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-1.5 text-xs font-medium text-neutral-500 mb-8"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          매시간 업데이트 · 실시간 트렌드 분석
        </div>

        {/* H1 */}
        <h1
          ref={headlineRef}
          className="max-w-4xl font-serif text-5xl font-bold leading-[1.1] tracking-tight text-[#1A1A1A] md:text-6xl lg:text-7xl mb-8"
        >
          트렌드는 느낌이 아니라<br />
          <span className="italic">데이터입니다</span>
        </h1>

        {/* Sub copy */}
        <p
          ref={subCopyRef}
          className="max-w-xl font-sans text-lg leading-relaxed text-[#555555] mb-10"
        >
          최근 48시간 동안 수집된 80,000개 영상 중<br />
          지금 이 순간 가장 빠르게 오르고 있는 영상과<br />
          7일간 눈에 띄게 성장한 채널을 찾아드립니다.
        </p>

        {/* CTA */}
        <div ref={ctaRef}>
          <Link href="/dashboard">
            <Button
              className="group h-14 rounded-full bg-black px-8 text-base font-medium text-white hover:scale-[0.96] active:scale-[0.93]"
              style={{ transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            >
              실시간 트렌드 보러가기
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Numbers / Data ─────────────────────────────── */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-10 leading-snug">
          매 순간 쌓이는 데이터가<br />트렌드를 만듭니다
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            {
              number: "80,000+",
              label: "최근 48시간 수집된 영상",
              sub: "2일 이내 업로드된 영상만 추적",
            },
            {
              number: "8,000+",
              label: "성장 채널 데이터베이스",
              sub: "최근 7일 눈에 띄는 채널만 선별",
            },
            {
              number: "매시간",
              label: "데이터 갱신 주기",
              sub: "1시간마다 최신 트렌드 반영",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-neutral-200 bg-[#f8f8f8] p-7 flex flex-col gap-2"
            >
              <span className="font-serif text-5xl md:text-6xl font-bold tracking-tight text-[#1A1A1A] leading-none">
                {card.number}
              </span>
              <span className="font-sans text-[15px] font-semibold text-[#1A1A1A] mt-1">
                {card.label}
              </span>
              <span className="font-sans text-sm text-[#888888]">
                {card.sub}
              </span>
            </div>
          ))}
        </div>

        <p className="font-sans text-lg text-[#555555] leading-relaxed">
          80,000개 영상 중 지금 이 순간<br className="hidden sm:block" />
          가장 빠르게 오르고 있는 영상을 찾아드립니다
        </p>
      </section>

      {/* ── Problem & Solution ─────────────────────────── */}
      <section className="px-6 pb-32 max-w-5xl mx-auto">

        {/* Problem */}
        <div className="mb-16">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3">
            유튜브 시작, 막막하신가요?
          </h2>
          <p className="font-sans text-[#555555] mb-10">
            많은 분들이 비슷한 벽에 부딪힙니다.
          </p>

          {/* Bento grid — 3 problem cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: <TrendingUp className="h-5 w-5 text-neutral-400" />,
                title: "방송국 영상만 가득한\n인기동영상",
                desc: "유튜브 인기 탭을 열면 대형 방송사, 연예인 채널이 독식합니다. 일반인이 참고할 만한 영상이 없어요.",
              },
              {
                icon: <Target className="h-5 w-5 text-neutral-400" />,
                title: "내 채널과 안 맞는\n트렌드",
                desc: "수백만 구독자 채널의 성공 방식은 막 시작한 채널에 그대로 적용하기 어렵습니다.",
              },
              {
                icon: <HelpCircle className="h-5 w-5 text-neutral-400" />,
                title: "무엇을 찍을지 모르는\n막막함",
                desc: "아이디어는 없고 시간은 흘러갑니다. 오늘도 빈 기획안 파일만 열어두고 닫았나요?",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-6 flex flex-col gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-neutral-100 flex items-center justify-center">
                  {card.icon}
                </div>
                <h3 className="font-sans font-semibold text-[#1A1A1A] text-base whitespace-pre-line leading-snug">
                  {card.title}
                </h3>
                <p className="font-sans text-sm text-[#555555] leading-relaxed">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Solution */}
        <div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3">
            하꼬의 반란!<br />
            <span className="italic">진짜 떡상하는 영상</span>을 찾아냅니다
          </h2>
          <p className="font-sans text-[#555555] mb-8">
            저희만의 핵심 알고리즘이 숨겨진 바이럴 영상을 발굴합니다.
          </p>

          {/* Formula card */}
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-8 md:p-12 text-center">
            <p className="font-sans text-sm uppercase tracking-widest text-neutral-400 mb-6">
              떡상 잠재력 지수
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <div className="flex flex-col items-center gap-1">
                <span className="font-serif text-4xl md:text-5xl font-bold text-[#1A1A1A]">조회수</span>
                <span className="font-sans text-xs text-neutral-400 uppercase tracking-wide">Views</span>
              </div>
              <span className="font-serif text-4xl md:text-5xl font-bold text-neutral-300">÷</span>
              <div className="flex flex-col items-center gap-1">
                <span className="font-serif text-4xl md:text-5xl font-bold text-[#1A1A1A]">구독자 수</span>
                <span className="font-sans text-xs text-neutral-400 uppercase tracking-wide">Subscribers</span>
              </div>
              <span className="font-serif text-4xl md:text-5xl font-bold text-neutral-300">×</span>
              <div className="flex flex-col items-center gap-1">
                <span className="font-serif text-4xl md:text-5xl font-bold text-[#1A1A1A]">100</span>
                <span className="font-sans text-xs text-neutral-400 uppercase tracking-wide">Multiplier</span>
              </div>
              <span className="font-serif text-4xl md:text-5xl font-bold text-neutral-300">=</span>
              <div className="flex flex-col items-center gap-1">
                <span className="font-serif text-4xl md:text-5xl font-bold text-black">Viral Score</span>
                <span className="font-sans text-xs text-neutral-400 uppercase tracking-wide">떡상 잠재력 지수</span>
              </div>
            </div>
            <p className="font-sans text-sm text-[#555555] mt-8 max-w-lg mx-auto leading-relaxed">
              구독자 수 대비 조회수가 폭발적으로 높은 영상 = 알고리즘이 밀어주는 영상.<br />
              이 공식으로 <strong className="text-[#1A1A1A]">구독자가 적어도 터진 영상</strong>을 정확히 찾아냅니다.
            </p>
            <div className="mt-8">
              <Link href="/dashboard">
                <Button
                  className="group h-12 rounded-full bg-black px-7 text-sm font-medium text-white hover:scale-[0.96] active:scale-[0.93]"
                  style={{ transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                >
                  바이럴 영상 지금 확인하기
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
