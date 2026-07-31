import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingUp, Users, Eye, Video } from "lucide-react";
import type { Metadata } from "next";
import { getChannel } from "@/lib/channels";
import { SITE } from "@/lib/site";
import { SparklineChart } from "./SparklineChart";

// 대상 채널이 1,100개가 넘고 매시간 수치가 바뀌므로 빌드 시 전량 프리렌더하지 않고
// 요청 시 SSR 한다. 데이터는 getChannel 내부에서 1시간 캐싱된다.
export const dynamic = "force-dynamic";

const TIER_LABEL: Record<number, string> = {
    1: "Tier 1",
    2: "Tier 2",
    3: "Tier 3",
};

const LEAGUE_LABEL: Record<string, string> = {
    SHORTS: "숏츠 중심",
    LONG: "롱폼 중심",
    HYBRID: "숏츠·롱폼 혼합",
};

function fmtKr(n: number, unit = ""): string {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억${unit}`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만${unit}`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천${unit}`;
    return `${n.toLocaleString()}${unit}`;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ channelId: string }>;
}): Promise<Metadata> {
    const { channelId } = await params;
    const data = await getChannel(channelId);
    if (!data) return { title: "채널을 찾을 수 없습니다", robots: { index: false } };

    const { channel, categoryRank, categoryTotal } = data;
    const title = `${channel.channel_title} 채널 분석 — 구독자·조회수 추이`;
    const description =
        `${channel.channel_title}의 구독자 ${fmtKr(channel.subscriber_count, "명")}, ` +
        `누적 조회수 ${fmtKr(channel.total_view_count, "회")}. ` +
        `${channel.main_category} 카테고리 ${categoryRank}위 (총 ${categoryTotal}개 채널). ` +
        `일평균 조회수 증가와 성장 지수를 매시간 갱신되는 데이터로 확인하세요.`;

    return {
        title,
        description,
        alternates: { canonical: `/channel/${channelId}` },
        openGraph: {
            title: `${channel.channel_title} 채널 분석 | Viral Hunter`,
            description,
            url: `${SITE.url}/channel/${channelId}`,
            type: "profile",
            images: channel.video_thumbnail ? [{ url: channel.video_thumbnail }] : undefined,
        },
    };
}

export default async function ChannelDetailPage({
    params,
}: {
    params: Promise<{ channelId: string }>;
}) {
    const { channelId } = await params;
    const data = await getChannel(channelId);

    if (!data) {
        notFound();
    }

    const {
        channel,
        sparkline,
        overallRank,
        overallTotal,
        categoryRank,
        categoryTotal,
        categoryMedianSubscribers,
    } = data;

    // 수집 데이터로 만드는 요약 문장 — 페이지마다 내용이 달라지도록 수치 기반으로 구성한다.
    const subMultiple =
        categoryMedianSubscribers > 0
            ? channel.subscriber_count / categoryMedianSubscribers
            : 0;
    const summarySentences = [
        `${channel.channel_title}은(는) ${channel.main_category} 카테고리에 속한 ` +
            `${LEAGUE_LABEL[channel.league_group] ?? channel.league_group} 채널로, ` +
            `구독자 ${fmtKr(channel.subscriber_count, "명")}을 보유하고 있습니다.`,
        subMultiple >= 1.1
            ? `같은 카테고리 채널의 구독자 중위값(${fmtKr(categoryMedianSubscribers, "명")}) 대비 ` +
              `약 ${subMultiple.toFixed(1)}배 규모로, 카테고리 ${categoryRank}위에 해당합니다.`
            : `같은 카테고리 채널의 구독자 중위값은 ${fmtKr(categoryMedianSubscribers, "명")}이며, ` +
              `이 채널은 카테고리 ${categoryRank}위(총 ${categoryTotal.toLocaleString()}개)입니다.`,
        channel.avg_daily_view_increase > 0
            ? `최근 일평균 조회수는 ${fmtKr(channel.avg_daily_view_increase, "회")}씩 증가하고 있으며, ` +
              `누적 조회수는 ${fmtKr(channel.total_view_count, "회")}입니다.`
            : `누적 조회수는 ${fmtKr(channel.total_view_count, "회")}입니다.`,
        channel.is_new_channel
            ? `최근 새로 편입된 채널로, 성장 추이를 지켜볼 만합니다.`
            : `전체 분석 대상 ${overallTotal.toLocaleString()}개 채널 중 구독자 ${overallRank.toLocaleString()}위입니다.`,
    ];

    const stats = [
        {
            icon: Users,
            label: "구독자",
            value: fmtKr(channel.subscriber_count, "명"),
            sub: channel.avg_daily_sub_increase
                ? `일평균 +${fmtKr(channel.avg_daily_sub_increase)}`
                : null,
        },
        {
            icon: Eye,
            label: "누적 조회수",
            value: fmtKr(channel.total_view_count, "회"),
            sub: channel.avg_daily_view_increase
                ? `일평균 +${fmtKr(channel.avg_daily_view_increase)}`
                : null,
        },
        {
            icon: Video,
            label: "영상 수",
            value: channel.video_count ? `${channel.video_count.toLocaleString()}개` : "—",
            sub: channel.top_video_views ? `최고 ${fmtKr(channel.top_video_views, "회")}` : null,
        },
        {
            icon: TrendingUp,
            label: "성장 지수",
            value: channel.damped_score ? channel.damped_score.toFixed(1) : "—",
            sub: `전체 ${overallRank.toLocaleString()}위 / ${overallTotal.toLocaleString()}개`,
        },
    ];

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        mainEntity: {
            "@type": "Organization",
            name: channel.channel_title,
            url: `https://www.youtube.com/channel/${channel.channel_id}`,
            ...(channel.video_thumbnail && { image: channel.video_thumbnail }),
            interactionStatistic: [
                {
                    "@type": "InteractionCounter",
                    interactionType: "https://schema.org/SubscribeAction",
                    userInteractionCount: channel.subscriber_count,
                },
                {
                    "@type": "InteractionCounter",
                    interactionType: "https://schema.org/WatchAction",
                    userInteractionCount: channel.total_view_count,
                },
            ],
        },
        url: `${SITE.url}/channel/${channel.channel_id}`,
    };

    const breadcrumbLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "대시보드", item: `${SITE.url}/dashboard` },
            {
                "@type": "ListItem",
                position: 2,
                name: "채널 분석",
                item: `${SITE.url}/dashboard/benchmarking`,
            },
            {
                "@type": "ListItem",
                position: 3,
                name: channel.channel_title,
                item: `${SITE.url}/channel/${channel.channel_id}`,
            },
        ],
    };

    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
            />

            <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
                <Link
                    href="/dashboard/benchmarking"
                    className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    채널 분석으로
                </Link>

                {/* 헤더 */}
                <header className="mb-10">
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600">
                            {TIER_LABEL[channel.tier] ?? `Tier ${channel.tier}`}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600">
                            {channel.main_category}
                        </span>
                        {channel.league_group && (
                            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600">
                                {LEAGUE_LABEL[channel.league_group] ?? channel.league_group}
                            </span>
                        )}
                        {channel.origin_type === "DOMESTIC" && (
                            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600">
                                국내
                            </span>
                        )}
                        {channel.is_new_channel && (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                신규
                            </span>
                        )}
                    </div>

                    <div className="flex items-start gap-4">
                        {channel.video_thumbnail && (
                            <Image
                                src={channel.video_thumbnail}
                                alt={`${channel.channel_title} 대표 영상 썸네일`}
                                width={120}
                                height={90}
                                className="shrink-0 rounded-xl border border-neutral-200 object-cover"
                                unoptimized
                            />
                        )}
                        <div className="min-w-0">
                            <h1
                                className="mb-2 font-serif text-2xl font-bold leading-tight tracking-tight text-[#1A1A1A] md:text-3xl"
                                style={{ fontFamily: "var(--font-playfair), serif" }}
                            >
                                {channel.channel_title}
                            </h1>
                            {/* '순위'가 한국 유튜브 전체 순위로 오해되지 않도록,
                                추적 대상 안에서의 상대 위치임을 문장에 드러낸다. */}
                            <p className="text-[13px] leading-relaxed text-neutral-500">
                                추적 중인 {channel.main_category} 채널{" "}
                                {categoryTotal.toLocaleString()}개 중 구독자{" "}
                                <strong className="font-semibold text-neutral-700">
                                    {categoryRank.toLocaleString()}번째
                                </strong>
                            </p>
                        </div>
                    </div>
                </header>

                {/* 지표 카드 */}
                <section className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {stats.map((s) => (
                        <div
                            key={s.label}
                            className="rounded-2xl border border-neutral-200 bg-white p-4"
                        >
                            <div className="mb-2 flex items-center gap-1.5 text-neutral-400">
                                <s.icon className="h-3.5 w-3.5" />
                                <span className="text-[11px] font-medium">{s.label}</span>
                            </div>
                            <div className="text-[17px] font-bold text-[#1A1A1A]">{s.value}</div>
                            {s.sub && (
                                <div className="mt-0.5 text-[11px] text-neutral-400">{s.sub}</div>
                            )}
                        </div>
                    ))}
                </section>

                {/* 요약 */}
                <section className="mb-12">
                    <h2 className="mb-3 text-[15px] font-bold text-[#1A1A1A]">채널 요약</h2>
                    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                        <p className="text-[13.5px] leading-[1.9] text-[#333333]">
                            {summarySentences.join(" ")}
                        </p>
                    </div>
                </section>

                {/* 추이 차트 */}
                <section className="mb-12">
                    <h2 className="mb-1 text-[15px] font-bold text-[#1A1A1A]">최근 성장 추이</h2>
                    <p className="mb-4 text-[12px] text-neutral-400">
                        실제로 측정된 날의 구독자·조회수 증가량만 표시합니다.
                    </p>
                    {sparkline.length >= 3 ? (
                        <SparklineChart points={sparkline} />
                    ) : (
                        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-[13px] text-neutral-400">
                            측정된 날이 {sparkline.length}일뿐이라 추이를 표시하지 않습니다.
                            <br />
                            <span className="text-[12px] text-neutral-400">
                                데이터가 더 쌓이면 자동으로 그래프가 나타납니다.
                            </span>
                        </div>
                    )}
                </section>

                {/* 외부 링크 */}
                <section className="border-t border-neutral-100 pt-8">
                    <div className="flex flex-wrap gap-2">
                        <a
                            href={`https://www.youtube.com/channel/${channel.channel_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full bg-black px-5 py-2 text-[13px] font-medium text-white transition-all hover:scale-[0.97]"
                        >
                            유튜브에서 채널 보기
                        </a>
                        {channel.representative_video_id && (
                            <a
                                href={`https://www.youtube.com/watch?v=${channel.representative_video_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-5 py-2 text-[13px] font-medium text-neutral-700 transition-all hover:bg-neutral-50"
                            >
                                대표 영상 보기
                            </a>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
