import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import {
    getTierSnapshot,
    isTierLevel,
    TIER_META,
    TIER_LEVELS,
    type TierLevel,
} from "@/lib/tiers";
import { SITE } from "@/lib/site";
import { MetricsDisclosure } from "@/components/legal";

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
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
            />

            {/* [2026-10-30] 새 디자인: 모양만 바꿨다. 글·링크는 그대로다 (썸네일만 더함). */}
            <main className="vh-main vh-narrow">
                <Link href="/tier" className="vh-back">
                    <ArrowLeft aria-hidden="true" />
                    구독자 구간 전체
                </Link>

                <header className="vh-phead">
                    <p className="vh-eyebrow">{meta.label}</p>
                    <h1>{meta.range} 급상승 영상</h1>
                    <p className="vh-lead">{meta.description}</p>
                    <p className="vh-lead vh-lead-sm">
                        국내 영상{" "}
                        <strong>{snap.totalDomestic.toLocaleString()}건</strong>{" "}
                        중 상위 {snap.videos.length}개 · 합계 시간당{" "}
                        <strong>+{fmtKr(snap.totalHourlyIncrease, "회")}</strong>
                        {snap.updatedAt && ` · ${snap.updatedAt} 집계`}
                    </p>
                    {/* YouTube API 정책 III.E.4.h: 자체 계산 지표 고지 */}
                    <MetricsDisclosure />
                </header>

                <ol className="vh-list">
                    {snap.videos.map((v, i) => (
                        <li
                            key={v.video_id}
                            className="vh-row"
                            data-top={i < 3 ? "" : undefined}
                            data-wide={i + 1 >= 100 ? "" : undefined}
                        >
                            <span className="vh-rk">{i + 1}</span>
                            <a
                                className="vh-th"
                                href={`https://www.youtube.com/watch?v=${v.video_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                tabIndex={-1}
                                aria-hidden="true"
                            >
                                <Image
                                    src={`https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg`}
                                    alt=""
                                    fill
                                    sizes="(max-width: 640px) 96px, 128px"
                                    unoptimized
                                />
                            </a>
                            <div className="vh-tt">
                                <a
                                    className="vh-title"
                                    href={`https://www.youtube.com/watch?v=${v.video_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {v.title}
                                </a>
                                <p className="vh-meta vh-meta-inline">
                                    {v.channel_title}
                                    <span className="vh-dot">·</span>
                                    {v.video_type}
                                    <span className="vh-dot">·</span>
                                    {v.category_name}
                                </p>
                            </div>
                            <div className="vh-mv">
                                <strong>+{fmtKr(v.hourly_view_increase)}</strong>
                                <small>누적 {fmtKr(v.total_views)}</small>
                            </div>
                        </li>
                    ))}
                </ol>

                {/* 이 목록이 무엇인지 밝힌다. '급상승'의 기준을 모르면 숫자를 해석할 수 없다. */}
                <p className="vh-note">
                    직전 1시간 동안 조회수가 늘어난 양(시간당 증가) 순으로 정렬했습니다.
                    국내 영상만 대상으로 하며, 매시간 갱신됩니다. 구독자 구간은 영상이 올라온
                    채널의 구독자 수를 기준으로 나눕니다.
                </p>

                {/* 다른 구간 — 내부 링크 */}
                <section className="vh-sec">
                    <h2 className="vh-sec-h">다른 구독자 구간</h2>
                    <ul className="vh-chiplist vh-chip2">
                        {others.map((l) => (
                            <li key={l}>
                                <Link href={`/tier/${l}`}>
                                    <span>{TIER_META[l].label}</span>
                                    <small>{TIER_META[l].range}</small>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            </main>
        </>
    );
}
