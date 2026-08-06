import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import {
    getTierSnapshot,
    isTierLevel,
    TIER_META,
    TIER_LEVELS,
    type TierLevel,
} from "@/lib/tiers";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

function fmtKr(n: number, unit = ""): string {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억${unit}`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만${unit}`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천${unit}`;
    return `${n.toLocaleString()}${unit}`;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ level: string }>;
}): Promise<Metadata> {
    const { level } = await params;
    if (!isTierLevel(level)) return { title: "찾을 수 없음", robots: { index: false } };

    const meta = TIER_META[level];
    const snap = await getTierSnapshot(level);
    const count = snap?.totalDomestic ?? 0;

    return {
        title: `${meta.range} 유튜브 급상승 영상`,
        description:
            `${meta.range}인 국내 유튜브 채널의 급상승 영상 ${count.toLocaleString()}건을 ` +
            `시간당 조회수 증가 순으로 정리했습니다. ${meta.description}`,
        alternates: { canonical: `/tier/${level}` },
        openGraph: {
            title: `${meta.range} 급상승 영상 | Viral Hunter`,
            description: meta.description,
            url: `${SITE.url}/tier/${level}`,
            type: "website",
        },
    };
}

export default async function TierPage({
    params,
}: {
    params: Promise<{ level: string }>;
}) {
    const { level } = await params;
    if (!isTierLevel(level)) notFound();

    const meta = TIER_META[level];
    const snap = await getTierSnapshot(level);
    if (!snap || snap.videos.length === 0) notFound();

    const others = TIER_LEVELS.filter((l) => l !== level);

    const itemListLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${meta.range} 급상승 영상`,
        url: `${SITE.url}/tier/${level}`,
        numberOfItems: snap.videos.length,
        itemListElement: snap.videos.slice(0, 10).map((v, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: v.title,
            url: `https://www.youtube.com/watch?v=${v.video_id}`,
        })),
    };

    const breadcrumbLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "구독자 구간", item: `${SITE.url}/tier` },
            { "@type": "ListItem", position: 2, name: meta.range, item: `${SITE.url}/tier/${level}` },
        ],
    };

    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
            />

            <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
                <Link
                    href="/tier"
                    className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    구독자 구간 전체
                </Link>

                <header className="mb-8">
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                        {meta.label}
                    </p>
                    <h1
                        className="mb-3 font-serif text-3xl font-bold leading-tight tracking-tight text-[#1A1A1A] md:text-4xl"
                        style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                        {meta.range} 급상승 영상
                    </h1>
                    <p className="mb-4 text-[13.5px] leading-relaxed text-[#333333]">
                        {meta.description}
                    </p>
                    <p className="text-[13px] text-neutral-500">
                        국내{" "}
                        <strong className="font-semibold text-neutral-700">
                            {snap.totalDomestic.toLocaleString()}건
                        </strong>{" "}
                        중 상위 {snap.videos.length}개 · 합계 시간당{" "}
                        <strong className="font-semibold text-neutral-700">
                            +{fmtKr(snap.totalHourlyIncrease, "회")}
                        </strong>
                        {snap.updatedAt && ` · ${snap.updatedAt} 집계`}
                    </p>
                </header>

                <ol className="space-y-2">
                    {snap.videos.map((v, i) => (
                        <li
                            key={v.video_id}
                            className="rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:bg-neutral-50/60"
                        >
                            <div className="flex items-start gap-3">
                                <span className="mt-0.5 w-6 shrink-0 text-right text-[12px] tabular-nums text-neutral-400">
                                    {i + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <a
                                        href={`https://www.youtube.com/watch?v=${v.video_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[14px] font-medium leading-snug text-[#1A1A1A] underline-offset-2 hover:underline"
                                    >
                                        {v.title}
                                    </a>
                                    <p className="mt-1 text-[12px] text-neutral-500">
                                        {v.channel_title}
                                        <span className="mx-1.5 text-neutral-300">·</span>
                                        {v.video_type}
                                        <span className="mx-1.5 text-neutral-300">·</span>
                                        {v.category_name}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums text-[#1A1A1A]">
                                        <TrendingUp className="h-3 w-3 text-orange-500" />
                                        +{fmtKr(v.hourly_view_increase)}
                                    </p>
                                    <p className="text-[11px] tabular-nums text-neutral-400">
                                        누적 {fmtKr(v.total_views)}
                                    </p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>

                {/* 다른 구간 — 내부 링크 */}
                <section className="mt-12 border-t border-neutral-100 pt-8">
                    <h2 className="mb-4 text-[14px] font-bold text-[#1A1A1A]">다른 구독자 구간</h2>
                    <ul className="flex flex-wrap gap-2">
                        {others.map((l) => (
                            <li key={l}>
                                <Link
                                    href={`/tier/${l}`}
                                    className="inline-flex flex-col rounded-xl border border-neutral-200 bg-white px-4 py-2.5 transition-colors hover:bg-neutral-50"
                                >
                                    <span className="text-[13px] font-medium text-[#1A1A1A]">
                                        {TIER_META[l].label}
                                    </span>
                                    <span className="text-[11px] text-neutral-400">
                                        {TIER_META[l].range}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            </main>
        </div>
    );
}
