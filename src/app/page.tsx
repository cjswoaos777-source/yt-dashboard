"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ArrowRight, TrendingUp, Target, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/legal";

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
          올라온 지 7일 안 된 영상 50만여 개를 매시간 다시 재서<br />
          지금 이 순간 가장 빠르게 오르고 있는 영상과<br />
          최근 7일 동안 눈에 띄게 성장한 채널을 찾아드립니다.
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
              number: "50만+",
              label: "매시간 다시 재는 영상",
              sub: "올라온 지 7일이 될 때까지 따라갑니다",
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
          50만여 개 영상 중 지금 이 순간<br className="hidden sm:block" />
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

      {/* ── 둘러보기 + 데이터 출처 ─────────────────────────────
          [2026-10-29] SEO 운영안: 홈에 '무엇을, 어떤 데이터로, 얼마나 자주, 누가'를 적는다.
          구글이 홈까지 '크롤링됨-색인 안 됨'으로 둔 상태라, 홍보 문구 대신 사이트의 실제 쓰임과
          데이터 출처를 보이는 글로 둔다. 숫자는 수집기 정의(utube_rank/agents/collector.py)와 맞춘다. */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3">
          Viral Hunter에서 볼 수 있는 것
        </h2>
        <p className="font-sans text-[#555555] mb-8">
          한국 유튜브에서 지금 뜨는 영상과 채널을 일곱 가지 방법으로 봅니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { href: "/dashboard", title: "실시간 급상승 순위", desc: "올라온 지 7일 안 된 영상을 최근 1시간 조회수로 줄 세운 TOP 1,000. 숏츠·롱폼, 카테고리, 구독자 구간별로 고를 수 있습니다." },
            { href: "/category", title: "카테고리별 급상승 유튜버", desc: "게임, 예능, 교육 등 11개 카테고리마다 이번 주 가장 빠르게 크는 채널을 모았습니다." },
            { href: "/dashboard/benchmarking", title: "성장 채널 분석", desc: "구독자 대비 조회수가 잘 나오는 채널을 체급별로 비교합니다. 개설 90일 안 된 신규 채널도 따로 볼 수 있습니다." },
            { href: "/ideas", title: "지금 만들 만한 영상", desc: "지금 반응을 보고 만들어 볼 만한 주제와 형식을 매시간 골라 드립니다. 메일로도 받을 수 있어요." },
            { href: "/report", title: "주간 트렌드 리포트", desc: "매주 월요일, 지난 한 주 무엇이 떴는지 숫자와 해석으로 정리합니다." },
            { href: "/insights", title: "데이터 인사이트", desc: "업로드 시간대, 숏츠와 롱폼, 채널 나이에 따라 성과가 어떻게 다른지 수집 데이터로 확인했습니다." },
            { href: "/about/metrics", title: "지표 설명", desc: "시간당 증가량, 성장 지수, 구독자 구간을 어떻게 계산하는지 공개합니다." },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col gap-2 transition-colors hover:border-neutral-400"
            >
              <h3 className="font-sans font-semibold text-[#1A1A1A] text-base flex items-center gap-1">
                {item.title}
                <ArrowRight className="h-4 w-4 text-neutral-400 transition-transform duration-200 group-hover:translate-x-1" />
              </h3>
              <p className="font-sans text-sm text-[#555555] leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-6">
          데이터는 이렇게 모읍니다
        </h2>
        <ul className="font-sans text-[#333333] leading-relaxed space-y-3 max-w-3xl list-disc pl-5">
          <li>
            <strong>출처</strong>: YouTube Data API로 받은 공개 데이터(조회수, 좋아요, 댓글, 구독자 수)입니다. 로그인이 필요한 데이터나
            채널 주인만 보는 통계는 쓰지 않습니다.
          </li>
          <li>
            <strong>수집 범위</strong>: 매일 오후 5시에 15개 카테고리에서 한국 지역 검색 기준으로 업로드 2일 안 된 영상을 찾고,
            4분 미만 영상은 조회수 3만 회, 4분 이상은 1만 회를 넘은 것만 모읍니다. 매시간 최근 3시간 안에 올라온 영상도
            같은 기준으로 더 찾습니다. 한국 유튜브 전체가 아니라 이미 반응이 오기 시작한 영상의 표본입니다.
          </li>
          <li>
            <strong>갱신 주기</strong>: 찾은 영상은 올라온 지 7일이 될 때까지 따라갑니다. 국내 영상은 매시간, 해외 영상은 잘 오르는
            12만 개만 매시간 다시 재고 나머지는 6시간마다 잽니다. 최근 7일 안에 수집에 걸린 채널의 구독자·조회수는 매일 오후 5시
            수집 뒤 한 번 받습니다.
          </li>
          <li>
            <strong>보관 기간</strong>: YouTube API 정책에 따라 영상·채널 수치는 30일이 지나면 지우거나 다시 받습니다. 그래서 오래전 기록은 남기지 않습니다.
          </li>
          <li>
            <strong>운영</strong>: 현직 데이터 엔지니어 한 명이 개인적으로 만들고 운영합니다. 유튜브(Google)와 관계가 없는 독립 사이트입니다.
          </li>
        </ul>
        <p className="font-sans text-sm text-[#555555] mt-6">
          계산 방식은 <Link href="/about/metrics" className="underline underline-offset-2 hover:text-[#1A1A1A]">지표 설명</Link>에서,
          운영자와 만든 이유는 <Link href="/about" className="underline underline-offset-2 hover:text-[#1A1A1A]">소개</Link>에서 볼 수 있습니다.
        </p>
      </section>

      {/* ── 운영자 안내 ─────────────────────────────────────── */}
      <section className="px-4 pb-14 sm:px-6 lg:px-10">
        <p className="mx-auto max-w-2xl text-center font-sans text-xs leading-relaxed text-neutral-400">
          이 사이트는 현직 데이터 엔지니어가 취미로 만들어 운영 중입니다.{" "}
          <Link
            href="/about"
            className="whitespace-nowrap text-neutral-500 underline-offset-2 transition-colors hover:text-neutral-800 hover:underline"
          >
            자세히 보기 →
          </Link>
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
