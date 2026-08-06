import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTierSnapshot, TIER_LEVELS, TIER_META } from "@/lib/tiers";
import { SITE } from "@/lib/site";

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
        <div className="min-h-screen bg-[#FDFDFC]">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
            />

            <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
                <Link
                    href="/dashboard"
                    className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    대시보드로
                </Link>

                <header className="mb-8">
                    <h1
                        className="mb-2 font-serif text-3xl font-bold leading-tight tracking-tight text-[#1A1A1A] md:text-4xl"
                        style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                        구독자 구간별 급상승 영상
                    </h1>
                    <p className="text-[13px] leading-relaxed text-neutral-500">
                        같은 조회수라도 구독자 1만 채널과 100만 채널의 의미는 다릅니다.
                        채널 규모별로 나눠서 지금 뜨는 국내 영상을 봅니다.
                    </p>
                </header>

                <ul className="space-y-3">
                    {TIER_LEVELS.map((level, i) => {
                        const meta = TIER_META[level];
                        const snap = snaps[i];
                        return (
                            <li key={level}>
                                <Link
                                    href={`/tier/${level}`}
                                    className="block rounded-2xl border border-neutral-200 bg-white p-5 transition-colors hover:bg-neutral-50/60"
                                >
                                    <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                        <h2 className="text-[15px] font-bold text-[#1A1A1A]">
                                            {meta.label}
                                        </h2>
                                        <span className="text-[12px] text-neutral-500">
                                            {meta.range}
                                        </span>
                                    </div>
                                    <p className="mb-3 text-[13px] leading-relaxed text-[#555555]">
                                        {meta.description}
                                    </p>
                                    {snap ? (
                                        <p className="text-[12px] tabular-nums text-neutral-400">
                                            국내 {snap.totalDomestic.toLocaleString()}건 · 합계
                                            시간당 +{fmtKr(snap.totalHourlyIncrease, "회")}
                                        </p>
                                    ) : (
                                        <p className="text-[12px] text-neutral-400">
                                            데이터를 불러오는 중입니다.
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
