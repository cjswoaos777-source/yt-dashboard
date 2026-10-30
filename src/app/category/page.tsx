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
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
            />

            {/* [2026-10-30] 새 디자인: 모양만 바꿨다. 글·링크는 그대로다. */}
            <main className="vh-main vh-narrow">
                <Link href="/dashboard" className="vh-back">
                    <ArrowLeft aria-hidden="true" />
                    대시보드로
                </Link>

                <header className="vh-phead">
                    <p className="vh-eyebrow">{dayLabel(overview.targetDate)} 기준</p>
                    <h1>카테고리별 급상승 유튜버 순위</h1>
                    <p className="vh-lead">
                        {CATEGORY_SLUGS.length}개 카테고리에서 최근 하루 평균 조회수가 가장 빠르게 늘고 있는
                        국내 유튜브 채널을 매일 정리합니다. 카테고리를 고르면 상위 30개 채널과 구독자가 빨리 느는 채널,
                        새로 생긴 채널을 볼 수 있습니다.
                    </p>
                    {/* /channel 목록과 같은 이유로 무엇이 아닌지도 밝힌다. */}
                    <p className="vh-note">
                        이 순위는 <strong>구독자 수 대비 조회 성과가 높은 채널</strong>을
                        골라 추적한 결과입니다. 구독자가 매우 많은 대형 채널은 선별 기준상 들어 있지 않아, 한국 유튜브
                        전체 구독자 순위와는 다릅니다.
                    </p>
                    {/* YouTube API 정책 III.E.4.h: 자체 계산 지표 고지 */}
                    <MetricsDisclosure />
                </header>

                <ul className="vh-catgrid">
                    {CATEGORY_SLUGS.map((s) => {
                        const meta = CATEGORY_META[s];
                        const snap = overview.categories[s];
                        const first = snap.top[0];
                        return (
                            <li key={s}>
                                <Link href={`/category/${s}`}>
                                    <h2>{meta.label} 유튜버 순위</h2>
                                    <p className="vh-catgrid-desc">{meta.description}</p>
                                    <p className="vh-catgrid-n">추적 채널 {snap.tracked.toLocaleString()}개</p>
                                    {first && (
                                        <p className="vh-catgrid-first">
                                            <span className="vh-catgrid-rk">1위</span>{" "}
                                            <span className="vh-catgrid-name">{first.channel_title}</span>
                                            <span className="vh-catgrid-v">
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
        </>
    );
}
