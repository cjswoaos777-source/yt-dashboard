import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTierSnapshot, TIER_LEVELS, TIER_META } from "@/lib/tiers";
import { SITE } from "@/lib/site";
import { MetricsDisclosure } from "@/components/legal";

export const dynamic = "force-dynamic";

function fmtKr(n: number, unit = ""): string {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억${unit}`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만${unit}`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천${unit}`;
    return `${n.toLocaleString()}${unit}`;
}

export const metadata: Metadata = {
    title: "구독자 구간별 유튜브 급상승 영상",
    description:
        "구독자 1만 미만부터 100만 이상까지, 채널 규모별로 지금 뜨고 있는 국내 유튜브 영상을 나눠서 봅니다. 구독자 수에 가려진 진짜 떡상 영상을 찾아보세요.",
    alternates: { canonical: "/tier" },
    openGraph: {
        title: "구독자 구간별 급상승 영상 | Viral Hunter",
        description: "채널 규모별로 나눠 보는 국내 유튜브 급상승 영상.",
        url: `${SITE.url}/tier`,
        type: "website",
    },
};

export default async function TierIndexPage() {
    // 4개뿐이라 한 번에 불러온다. 각 스냅샷은 내부에서 캐싱된다.
    const snaps = await Promise.all(TIER_LEVELS.map((l) => getTierSnapshot(l)));

    const itemListLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "구독자 구간별 급상승 영상",
        url: `${SITE.url}/tier`,
        numberOfItems: TIER_LEVELS.length,
        itemListElement: TIER_LEVELS.map((l, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: TIER_META[l].range,
            url: `${SITE.url}/tier/${l}`,
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
                    <h1>구독자 구간별 급상승 영상</h1>
                    <p className="vh-lead">
                        같은 조회수라도 구독자 1만 채널과 100만 채널의 의미는 다릅니다.
                        채널 규모별로 나눠서 지금 뜨는 국내 영상을 봅니다.
                    </p>
                    {/* YouTube API 정책 III.E.4.h: 자체 계산 지표 고지 */}
                    <MetricsDisclosure />
                </header>

                <ul className="vh-catgrid vh-tiergrid">
                    {TIER_LEVELS.map((level, i) => {
                        const meta = TIER_META[level];
                        const snap = snaps[i];
                        return (
                            <li key={level}>
                                <Link href={`/tier/${level}`}>
                                    <div className="vh-tiergrid-head">
                                        <h2>{meta.label}</h2>
                                        <span>{meta.range}</span>
                                    </div>
                                    <p className="vh-catgrid-desc">{meta.description}</p>
                                    {snap ? (
                                        <p className="vh-catgrid-n">
                                            국내 {snap.totalDomestic.toLocaleString()}건 · 합계
                                            시간당 +{fmtKr(snap.totalHourlyIncrease, "회")}
                                        </p>
                                    ) : (
                                        <p className="vh-catgrid-n">데이터를 불러오는 중입니다.</p>
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
