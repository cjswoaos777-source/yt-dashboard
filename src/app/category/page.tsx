import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { CATEGORY_META, CATEGORY_SLUGS, getCategoryOverview } from "@/lib/categories";
import { SITE } from "@/lib/site";
import { MetricsDisclosure } from "@/components/legal";

export const dynamic = "force-dynamic";

function fmtKr(n: number, unit = ""): string {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억${unit}`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만${unit}`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천${unit}`;
    return `${n.toLocaleString()}${unit}`;
}

/** '2026-10-26' → '10월 26일' */
function dayLabel(d: string): string {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${parseInt(m[2], 10)}월 ${parseInt(m[3], 10)}일` : d;
}

export const metadata: Metadata = {
    title: "카테고리별 유튜버 순위 - 게임·음악·스포츠 요즘 뜨는 채널",
    description:
        `게임·엔터테인먼트·스포츠·교육·음악 등 ${CATEGORY_SLUGS.length}개 카테고리에서 ` +
        "최근 하루 평균 조회수가 가장 빠르게 늘고 있는 국내 유튜브 채널 순위를 매일 정리합니다.",
    alternates: { canonical: "/category" },
    openGraph: {
        title: "카테고리별 급상승 유튜버 순위 | Viral Hunter",
        description: "카테고리마다 요즘 조회수가 가장 빠르게 느는 국내 유튜브 채널.",
        url: `${SITE.url}/category`,
        type: "website",
    },
};

export default async function CategoryIndexPage() {
    const overview = await getCategoryOverview();
    if (!overview) notFound();

    const itemListLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "카테고리별 급상승 유튜버 순위",
        url: `${SITE.url}/category`,
        numberOfItems: CATEGORY_SLUGS.length,
        itemListElement: CATEGORY_SLUGS.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `급상승 ${CATEGORY_META[s].label} 유튜버 순위`,
            url: `${SITE.url}/category/${s}`,
        })),
    };

    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
            />

            <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-10">
                <Link
                    href="/dashboard"
                    className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    대시보드로
                </Link>

                <header className="mb-8">
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                        {dayLabel(overview.targetDate)} 기준
                    </p>
                    <h1
                        className="mb-3 font-serif text-3xl font-bold leading-tight tracking-tight text-[#1A1A1A] md:text-4xl"
                        style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                        카테고리별 급상승 유튜버 순위
                    </h1>
                    <p className="mb-3 text-[13.5px] leading-relaxed text-[#333333]">
                        {CATEGORY_SLUGS.length}개 카테고리에서 최근 하루 평균 조회수가 가장 빠르게 늘고 있는
                        국내 유튜브 채널을 매일 정리합니다. 카테고리를 고르면 상위 30개 채널과 구독자가 빨리 느는 채널,
                        새로 생긴 채널을 볼 수 있습니다.
                    </p>
                    {/* /channel 목록과 같은 이유로 무엇이 아닌지도 밝힌다. */}
                    <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[12px] leading-relaxed text-neutral-500">
                        이 순위는 <strong className="text-neutral-700">구독자 수 대비 조회 성과가 높은 채널</strong>을
                        골라 추적한 결과입니다. 구독자가 매우 많은 대형 채널은 선별 기준상 들어 있지 않아, 한국 유튜브
                        전체 구독자 순위와는 다릅니다.
                    </p>
                    {/* YouTube API 정책 III.E.4.h: 자체 계산 지표 고지 */}
                    <MetricsDisclosure className="mt-3" />
                </header>

                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {CATEGORY_SLUGS.map((s) => {
                        const meta = CATEGORY_META[s];
                        const snap = overview.categories[s];
                        const first = snap.top[0];
                        return (
                            <li key={s}>
                                <Link
                                    href={`/category/${s}`}
                                    className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:bg-neutral-50/60"
                                >
                                    <h2 className="text-[15px] font-bold text-[#1A1A1A]">
                                        {meta.label} 유튜버 순위
                                    </h2>
                                    <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                                        {meta.description}
                                    </p>
                                    <p className="mt-3 text-[12px] text-neutral-400">
                                        추적 채널 {snap.tracked.toLocaleString()}개
                                    </p>
                                    {first && (
                                        <p className="mt-1 truncate text-[12.5px] text-neutral-700">
                                            <span className="text-neutral-400">1위</span>{" "}
                                            <span className="font-medium">{first.channel_title}</span>
                                            <span className="ml-1.5 tabular-nums text-neutral-500">
                                                하루 +{fmtKr(first.avg_daily_view_increase, "회")}
                                            </span>
                                        </p>
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </main>
        </div>
    );
}
