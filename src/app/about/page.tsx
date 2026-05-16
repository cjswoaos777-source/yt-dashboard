import Link from "next/link";
import { ArrowRight, Database, Code2, Mail, BookOpen } from "lucide-react";

export const metadata = {
    title: "소개",
    description: "한국 유튜브 영상의 시간당 조회수/좋아요/댓글 급상승을 실시간 추적하는 무료 데이터 분석 도구",
    alternates: { canonical: "/about" },
    openGraph: {
        title: "소개 | Viral Hunter",
        description: "한국 유튜브 영상의 시간당 조회수/좋아요/댓글 급상승을 실시간 추적하는 무료 데이터 분석 도구",
        url: "/about",
        type: "website",
    },
};

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-10">

                {/* ── Hero ────────────────────────────────────────── */}
                <section className="mb-16">
                    <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                            About · Viral Hunter
                        </span>
                    </div>
                    <h1
                        className="font-serif text-4xl font-bold leading-tight tracking-tight text-[#1A1A1A] md:text-5xl"
                        style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                        🔥 Viral Hunter란?
                    </h1>
                    <p className="mt-5 text-lg leading-relaxed text-[#555555]">
                        한국 유튜브 영상의 <strong className="text-[#1A1A1A]">시간당 조회수/좋아요/댓글 급상승</strong>을
                        실시간 추적하는 <strong className="text-[#1A1A1A]">무료 데이터 분석 도구</strong>입니다.
                        구독자 수에 가려진, 진짜로 떡상하고 있는 영상을 매시간 발굴합니다.
                    </p>
                </section>

                {/* ── 사용 방법 ─────────────────────────────────── */}
                <section className="mb-16">
                    <h2 className="mb-2 font-serif text-2xl font-bold text-[#1A1A1A] md:text-3xl">
                        🎯 이렇게 사용하세요
                    </h2>
                    <p className="mb-8 text-sm text-[#555555]">
                        Viral Hunter는 이런 분들께 가장 유용합니다.
                    </p>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {[
                            {
                                num: "01",
                                title: "마이크로 채널 떡상 영상 발견",
                                desc: "구독자 1만 이하의 채널에서 알고리즘을 탄 영상을 찾아 기획을 분석하세요.",
                                tag: "구독자 필터 → 마이크로",
                            },
                            {
                                num: "02",
                                title: "본인 분야 트렌드 파악",
                                desc: "내 카테고리에서 지금 이 순간 가장 빠르게 오르는 영상을 확인하세요.",
                                tag: "카테고리 필터",
                            },
                            {
                                num: "03",
                                title: "해외 트렌드 미리 보기",
                                desc: "국내에 상륙하기 전, 해외에서 먼저 터지고 있는 콘텐츠 흐름을 캐치하세요.",
                                tag: "지역 필터 → 해외",
                            },
                        ].map((item) => (
                            <div
                                key={item.num}
                                className="flex flex-col rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <span
                                    className="mb-3 font-serif text-3xl font-bold text-neutral-200"
                                    style={{ fontFamily: "var(--font-playfair), serif" }}
                                >
                                    {item.num}
                                </span>
                                <h3 className="mb-2 text-base font-bold text-[#1A1A1A] tracking-tight">
                                    {item.title}
                                </h3>
                                <p className="flex-1 text-sm leading-relaxed text-[#555555]">
                                    {item.desc}
                                </p>
                                <span className="mt-4 inline-flex w-fit rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-500">
                                    {item.tag}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── 데이터 정보 ────────────────────────────────── */}
                <section className="mb-16">
                    <h2 className="mb-2 font-serif text-2xl font-bold text-[#1A1A1A] md:text-3xl">
                        📊 데이터 정보
                    </h2>
                    <p className="mb-8 text-sm text-[#555555]">
                        매시간 자동으로 갱신되는 신뢰할 수 있는 데이터.
                    </p>

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {[
                            { label: "추적 영상", value: "8만+", sub: "최근 48시간" },
                            { label: "추적 채널", value: "8천+", sub: "성장 채널 선별" },
                            { label: "업데이트", value: "매시간", sub: "자동 갱신" },
                            { label: "데이터 출처", value: "YouTube", sub: "Data API v3" },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm"
                            >
                                <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                                    {stat.label}
                                </p>
                                <p
                                    className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#1A1A1A] md:text-3xl"
                                    style={{ fontFamily: "var(--font-playfair), serif" }}
                                >
                                    {stat.value}
                                </p>
                                <p className="mt-1 text-[11px] text-neutral-400">{stat.sub}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── 기술 스택 ────────────────────────────────── */}
                <section className="mb-16">
                    <h2 className="mb-2 font-serif text-2xl font-bold text-[#1A1A1A] md:text-3xl">
                        ⚙️ 기술 스택
                    </h2>
                    <p className="mb-8 text-sm text-[#555555]">
                        견고하게 설계된 데이터 파이프라인.
                    </p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {[
                            { icon: <Database className="h-4 w-4" />, role: "데이터", stack: "YouTube Data API · Google BigQuery" },
                            { icon: <Code2 className="h-4 w-4" />, role: "백엔드", stack: "Python · Cloud Run" },
                            { icon: <Code2 className="h-4 w-4" />, role: "프론트엔드", stack: "Next.js 16 · Vercel" },
                            { icon: <Database className="h-4 w-4" />, role: "자동화", stack: "Stored Procedure · Cron" },
                        ].map((tech) => (
                            <div
                                key={tech.role}
                                className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm"
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                                    {tech.icon}
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                                        {tech.role}
                                    </p>
                                    <p className="text-sm font-medium text-[#1A1A1A]">
                                        {tech.stack}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── 만든 사람 / 연락처 ───────────────────────── */}
                <section className="mb-12">
                    <h2 className="mb-2 font-serif text-2xl font-bold text-[#1A1A1A] md:text-3xl">
                        📧 만든 사람
                    </h2>
                    <p className="mb-8 text-sm text-[#555555]">
                        피드백과 제안은 언제든 환영합니다.
                    </p>

                    <div className="rounded-2xl border border-neutral-100 bg-gradient-to-br from-orange-50/40 to-white p-7 shadow-sm">
                        <p className="text-base leading-relaxed text-[#1A1A1A]">
                            <strong>취미로 만든 사이드 프로젝트</strong>예요.
                            상업적 목적 없이, 유튜브 데이터를 다루는 게 재미있어서 시작했습니다.
                            사용해보시고 좋았다면 한 번 알려주세요. 더 좋은 도구를 만드는 큰 힘이 됩니다.
                        </p>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <a
                                href="mailto:cjswoaos777@gmail.com"
                                className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-all hover:scale-[0.97]"
                            >
                                <Mail className="h-4 w-4" />
                                cjswoaos777@gmail.com
                            </a>
                            <a
                                href="https://datahunter777.tistory.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-[#1A1A1A] transition-all hover:border-neutral-300 hover:bg-neutral-50"
                            >
                                <BookOpen className="h-4 w-4" />
                                블로그 방문하기
                                <ArrowRight className="h-3.5 w-3.5" />
                            </a>
                        </div>
                    </div>
                </section>

                {/* ── CTA ───────────────────────────────────────── */}
                <section className="text-center">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-all hover:scale-[0.97]"
                    >
                        실시간 랭킹 보러가기
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </section>

            </main>
        </div>
    );
}
