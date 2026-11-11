import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getChannel, isAwaitingBaseline, isIndexableChannel, isGoogleIndexableChannel, daysSinceKst } from "@/lib/channels";
import { SITE } from "@/lib/site";
import { SparklineChart } from "./SparklineChart";
import { ChannelShare } from "./ChannelShare";
import { MetricsDisclosure } from "@/components/legal";
import { buildInsight } from "@/lib/channel-insight";
import { buildExtraView } from "@/lib/channel-extra";
import { Num } from "@/components/site/rank";
import { withJosa } from "@/lib/josa";
import { buildChannelTitle } from "@/lib/channel-title";

// 대상 채널이 1,100개가 넘으므로 빌드 시 전량 프리렌더하지 않고 요청 시 SSR 한다.
// 채널 수치는 하루 1회(매일 저녁) 갱신되며, 데이터는 getChannel 내부에서 캐싱된다.
export const dynamic = "force-dynamic";

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

    const { channel, categoryRank, categoryTotal, isCurrent, lastSeen } = data;
    // [2026-11-11] 제목을 채널마다 다른 사실로 만든다 (channel-title.ts).
    const metaInsight = data.recent?.insight ? buildInsight(data.recent.insight, channel.subscriber_count ?? 0) : null;
    const title = buildChannelTitle({
        name: channel.channel_title,
        subsText: fmtKr(channel.subscriber_count, "명"),
        mainCategory: channel.main_category,
        league: channel.league_group,
        isCurrent,
        categoryRank,
        daysSeen: data.daysSeen,
        tags: metaInsight?.tags ?? [],
    });
    const topics = (data.extra?.topics ?? []).slice(0, 3).map((t) => `#${t.t}`);
    const rankSentence = isCurrent
        ? `${channel.main_category} 카테고리 국내 채널 ${categoryTotal.toLocaleString()}곳 중 구독자 ${categoryRank.toLocaleString()}위. `
        : `${channel.main_category} 카테고리. ${lastSeen ?? ""}까지 Viral Hunter 채널 순위에 올랐던 채널. `;
    // 검색 결과 설명문도 채널마다 달라지도록, 최근 포착 영상이 있으면 그 제목을 넣는다.
    const topVideo = data.recent?.videos?.[0];
    const description =
        `${channel.channel_title}의 구독자 ${fmtKr(channel.subscriber_count, "명")}, ` +
        `누적 조회수 ${fmtKr(channel.total_view_count, "회")}. ` +
        rankSentence +
        (topVideo
            ? `최근 30일 포착 영상 ${data.recent!.videos_30d}개, 가장 많이 본 영상 「${topVideo.t}」.`
            : topics.length > 0
              ? `자주 다루는 주제 ${topics.join(" ")}.`
              : `일평균 조회수 증가와 성장 지수를 매일 저녁 갱신되는 데이터로 확인하세요.`);

    // [2026-09-11] 색인 정책을 '등장 일수'로 정한다.
    //
    // 전에는 무조건 noindex 였다 — 채널 셋이 하루 ~17%씩 회전해 색인시킨 페이지가
    // 곧 404 가 됐기 때문이다. 이제 페이지는 channel_archive(영구 기록)에 묶여
    // 순위에서 빠져도 사라지지 않으므로 그 걱정은 없다.
    //
    // 남은 걱정은 '얇은 페이지'다. 하루만 스쳐간 채널은 보여줄 데이터가 거의 없어
    // 구글이 내용 없는 페이지로 볼 수 있다. 며칠 이상 등장한 채널만 색인시킨다.
    // (Search Console 에서 채널 이름이 검색 유입 키워드로 잡히는 것을 확인했다 —
    //  이 페이지들이 실제로 찾아지고 있다)
    //
    // GitHub 경로는 daysSeen 이 0 이라 여전히 noindex 다.
    // [2026-10-12] 순위에서 빠진 지 30일이 넘은 기록 페이지도 뺀다 (isIndexableChannel 주석).
    // [2026-10-29] 단, 최근 영상이 계속 잡히는 기록 채널은 다음·빙·네이버에 남긴다(1단계).
    const indexable = isIndexableChannel(data);
    // [2026-10-21] 구글에만 더 높은 기준(14일). googleBot 은 meta name="googlebot" 으로 나간다.
    // [2026-10-29] 스팸 업데이트 회복 전까지 구글에는 채널 상세를 전부 내보내지 않는다.
    const googleIndexable = isGoogleIndexableChannel(data);

    return {
        title,
        description,
        robots: { index: indexable, follow: true, googleBot: { index: googleIndexable, follow: true } },
        alternates: { canonical: `/channel/${channelId}` },
        openGraph: {
            title: `${title} | Viral Hunter`,
            description,
            url: `${SITE.url}/channel/${channelId}`,
            type: "profile",
            // [2026-10-16] 미리보기 이미지는 같은 폴더의 opengraph-image.tsx(성과 카드)가 채운다.
            // 여기서 images 를 지정하면 그 카드 대신 영상 썸네일이 뜬다.
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
        risingRank,
        risingTotal,
        isCurrent,
        firstSeen,
        lastSeen,
        daysSeen,
        related = [],
        recent = null,
    } = data;
    const recentVideos = recent?.videos ?? [];
    // 사이트맵 채널만 분석이 있다 (channel-insight.ts)
    const insight = recent?.insight ? buildInsight(recent.insight, channel.subscriber_count ?? 0) : null;
    // 채널 고유 정보(주제 태그·업로드 요일·영상 길이).
    // [2026-11-11] SEO 실험 ch-unique-2026-10 때는 실험군(절반)에만 보였다. 실험이 10-29 에 닫혀서 모든 채널에 보인다.
    const extraView = data.extra ? buildExtraView(data.extra) : null;

    // 측정이 1회뿐이면 일평균이 0 으로 저장되는데 이는 '성장 없음'이 아니라 '계산 불가'다.
    // 그냥 항목을 숨기면 왜 없는지 알 수 없으므로 이유를 밝힌다.
    const awaitingBaseline = isAwaitingBaseline(channel);

    // 순위에서 빠진 채널: 아카이브의 마지막 값을 보여주되, 그것이 '지금'이 아님을
    // 문장과 배너로 분명히 한다. 오래된 숫자를 현재처럼 읽히게 두면 안 된다.
    const daysAgo = daysSinceKst(lastSeen);

    // 수집 데이터로 만드는 요약 문장 — 페이지마다 내용이 달라지도록 수치 기반으로 구성한다.
    const subMultiple =
        categoryMedianSubscribers > 0
            ? channel.subscriber_count / categoryMedianSubscribers
            : 0;
    const summarySentences = [
        `${withJosa(channel.channel_title, "은는")} ${channel.main_category} 카테고리에 속한 ` +
            (channel.league_group ? `${LEAGUE_LABEL[channel.league_group] ?? channel.league_group} 채널로, ` : "채널로, ") +
            `구독자 ${fmtKr(channel.subscriber_count, "명")}을 보유하고 있습니다.`,
        // 순위 비교 문장은 오늘 보드에 있을 때만. 기록 모드에서는 이력 문장으로 대체한다.
        !isCurrent
            ? `${firstSeen ?? "?"}부터 ${lastSeen ?? "?"}까지 총 ${daysSeen}일 Viral Hunter 채널 순위에 올랐으며, ` +
              `지금은 지금 뜨는 채널에 없습니다. 아래 수치는 ${lastSeen ?? "마지막 수집일"} 기준입니다.`
            : subMultiple >= 1.1
              ? `같은 카테고리 채널의 구독자 중위값(${fmtKr(categoryMedianSubscribers, "명")}) 대비 ` +
                `약 ${subMultiple.toFixed(1)}배 규모로, 카테고리 구독자 ${categoryRank.toLocaleString()}위에 해당합니다.`
              : `같은 카테고리 채널의 구독자 중위값은 ${fmtKr(categoryMedianSubscribers, "명")}이며, ` +
                `이 채널은 카테고리 구독자 ${categoryRank.toLocaleString()}위(총 ${categoryTotal.toLocaleString()}곳)입니다.`,
        channel.avg_daily_view_increase > 0
            ? `${isCurrent ? "최근" : "마지막 수집 시점"} 일평균 조회수는 ${fmtKr(channel.avg_daily_view_increase, "회")}씩 증가${isCurrent ? "하고 있으며" : "했으며"}, ` +
              `누적 조회수는 ${fmtKr(channel.total_view_count, "회")}입니다.`
            : awaitingBaseline
              ? `누적 조회수는 ${fmtKr(channel.total_view_count, "회")}이며, ` +
                `추적을 막 시작해 일평균 증가량은 아직 산출되지 않았습니다.`
              : `누적 조회수는 ${fmtKr(channel.total_view_count, "회")}입니다.`,
        !isCurrent
            ? (daysSeen >= 7
                ? `${daysSeen}일간 순위에 올랐던 채널이라 당시 흐름을 참고할 만합니다.`
                : `짧게 순위에 올랐던 채널이라 참고 데이터가 제한적입니다.`)
            : risingRank > 0
              ? `최근 7일 안에 영상이 수집된 국내 채널 중 떠오르는 순 ${risingRank.toLocaleString()}위` +
                `(${risingTotal.toLocaleString()}곳 중), 구독자 ${overallRank.toLocaleString()}위` +
                `(${overallTotal.toLocaleString()}곳 중)입니다.`
              : channel.is_new_channel
                ? `숫자를 받기 시작한 지 얼마 안 된 채널이라, 성장 추이를 지켜볼 만합니다.`
                : `최근 7일 안에 영상이 수집된 국내 채널 ${overallTotal.toLocaleString()}곳 중 구독자 ${overallRank.toLocaleString()}위입니다.`,
        // 최근 30일 기록 — 이 채널에만 있는 내용(영상 제목, 실제 구독자 변화)이다.
        recentVideos.length > 0
            ? `최근 30일 동안 영상 ${recent!.videos_30d}개가 급상승 후보로 포착됐고` +
              (recent!.shorts_30d > 0 && recent!.shorts_30d < recent!.videos_30d
                  ? `(숏츠 ${recent!.shorts_30d}개, 롱폼 ${recent!.videos_30d - recent!.shorts_30d}개)`
                  : recent!.shorts_30d === recent!.videos_30d ? "(모두 숏츠)" : "(모두 롱폼)") +
              `, 그중 가장 많이 본 영상은 「${recentVideos[0].t}」(조회수 ${fmtKr(recentVideos[0].v, "회")})입니다.`
            : "",
        recent?.subs_from != null && recent.subs_to != null
            ? recent.subs_to === recent.subs_from
                ? `${recent.subs_from_date}부터 ${recent.subs_to_date}까지 구독자 수는 ${fmtKr(recent.subs_to, "명")}으로 변화가 없었습니다.`
                : `${recent.subs_from_date} ${fmtKr(recent.subs_from, "명")}이던 구독자는 ` +
                  `${recent.subs_to_date} ${fmtKr(recent.subs_to, "명")}으로 ` +
                  `${recent.subs_to > recent.subs_from ? "+" : "-"}${fmtKr(Math.abs(recent.subs_to - recent.subs_from), "명")} 변했습니다.`
            : "",
    ].filter(Boolean);

    const stats = [
        {
            label: "구독자",
            value: fmtKr(channel.subscriber_count, "명"),
            sub: channel.avg_daily_sub_increase
                ? `일평균 +${fmtKr(channel.avg_daily_sub_increase)}`
                : null,
        },
        {
            label: "누적 조회수",
            value: fmtKr(channel.total_view_count, "회"),
            sub: channel.avg_daily_view_increase
                ? `일평균 +${fmtKr(channel.avg_daily_view_increase)}`
                : awaitingBaseline
                  ? "일평균 산출 전"
                  : null,
        },
        {
            label: "영상 수",
            value: channel.video_count ? `${channel.video_count.toLocaleString()}개` : "—",
            sub: channel.top_video_views ? `최고 ${fmtKr(channel.top_video_views, "회")}` : null,
        },
        {
            label: "성장 지수",
            value: channel.damped_score ? channel.damped_score.toFixed(1) : "—",
            // 떠오르는 순 순위 (/channel 첫 화면과 같은 순서). 순위에 없거나 기록 모드면 숨긴다.
            sub: isCurrent && risingRank > 0
                ? `떠오르는 순 ${risingRank.toLocaleString()}위 / ${risingTotal.toLocaleString()}곳`
                : null,
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
                name: "지금 뜨는 채널",
                item: `${SITE.url}/channel`,
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
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
            />

            {/* [2026-10-30] 새 디자인: 모양만 바꿨다. 글·링크·순서는 그대로다 (색인 중인 페이지라). */}
            <main className="vh-main vh-chd">
                <Link href="/channel" className="vh-back">
                    <ArrowLeft aria-hidden="true" />
                    지금 뜨는 채널로
                </Link>

                {/* 헤더 */}
                {/* 순위에서 빠진 채널 — 이 페이지가 '기록'임을 가장 먼저 알린다.
                    숫자를 먼저 보고 현재로 오해하는 일이 없도록 헤더 위에 둔다. */}
                {!isCurrent && (
                    <div className="vh-alert">
                        <strong>지금은 지금 뜨는 채널(최근 7일 안에 영상이 수집된 국내 채널)에 없는 채널입니다.</strong>{" "}
                        {firstSeen && lastSeen && (
                            <>
                                {firstSeen} ~ {lastSeen} 사이 {daysSeen}일 순위에 올랐고,
                                {daysAgo !== null && ` 마지막 수집은 ${daysAgo}일 전입니다.`}
                            </>
                        )}{" "}
                        아래 수치는 <strong>마지막 수집 시점</strong> 기준이며 현재 값과 다를 수 있습니다.
                    </div>
                )}

                <header className="vh-chd-head">
                    {channel.video_thumbnail && (
                        <Image
                            src={channel.video_thumbnail}
                            alt={`${channel.channel_title} 대표 영상 썸네일`}
                            width={320}
                            height={180}
                            className="vh-chd-cover"
                            unoptimized
                            priority
                        />
                    )}
                    <div className="vh-chd-id">
                        <div className="vh-badges">
                            {!isCurrent && <span className="vh-badge vh-badge-warn">기록</span>}
                            {/* [2026-10-31] 등급(Tier) 배지는 뺐다. 8,000곳 선별 순위의 등급이라 보드에는 없다. */}
                            <span className="vh-badge">{channel.main_category}</span>
                            {channel.league_group && (
                                <span className="vh-badge">{LEAGUE_LABEL[channel.league_group] ?? channel.league_group}</span>
                            )}
                            {channel.origin_type === "DOMESTIC" && <span className="vh-badge">국내</span>}
                            {channel.is_new_channel && <span className="vh-badge vh-badge-new">신규</span>}
                        </div>
                        <h1>{channel.channel_title}</h1>
                        {/* '순위'가 한국 유튜브 전체 순위로 오해되지 않도록,
                            추적 대상 안에서의 상대 위치임을 문장에 드러낸다. */}
                        {/* 기록 모드에선 순위가 0 이라 "0개 중 0번째"가 찍혔다. 대신 등장 이력을 쓴다. */}
                        {isCurrent ? (
                            <p className="vh-chd-rank">
                                최근 7일 안에 수집된 국내 {channel.main_category} 채널{" "}
                                {categoryTotal.toLocaleString()}곳 중 구독자{" "}
                                <strong>{categoryRank.toLocaleString()}번째</strong>
                                {risingRank > 0 && (
                                    <>
                                        {" "}· <Link href="/channel">떠오르는 순</Link>{" "}
                                        <strong>{risingRank.toLocaleString()}위</strong>
                                    </>
                                )}
                            </p>
                        ) : (
                            <p className="vh-chd-rank">
                                {channel.main_category} 카테고리 · Viral Hunter 채널 순위{" "}
                                <strong>{daysSeen}일</strong> 등장
                                {lastSeen && ` (마지막 ${lastSeen})`}
                            </p>
                        )}
                    </div>
                    {/* YouTube API 정책 III.E.4.h: 자체 계산 지표 고지 */}
                    <MetricsDisclosure className="vh-chd-disc" />
                </header>

                {/* 지표 카드 */}
                <section className="vh-kpis" aria-label="채널 지표">
                    {stats.map((s) => (
                        <div key={s.label} className="vh-kpi">
                            <small>{s.label}</small>
                            <strong>
                                <Num t={s.value} />
                            </strong>
                            {s.sub && <span>{s.sub}</span>}
                        </div>
                    ))}
                </section>

                {/* 공유 — 채널 주인·팬이 링크를 퍼뜨리게 한다 (ChannelShare 주석) */}
                <ChannelShare
                    channelId={channel.channel_id}
                    pageUrl={`${SITE.url}/channel/${channel.channel_id}`}
                    channelTitle={channel.channel_title}
                    shareText={
                        isCurrent && categoryRank > 0
                            ? `📈 ${channel.channel_title} · ${channel.main_category} 구독자 ${categoryRank}위 | Viral Hunter`
                            : `📈 ${channel.channel_title} · 채널 순위 ${daysSeen}일 등장 | Viral Hunter`
                    }
                />

                {/* 채널 분석 — 비슷한 채널과 비교한 해석. 페이지마다 다른 문장이 나오는 중심 내용이다. */}
                {insight && insight.sentences.length > 0 && (
                    <section className="vh-sec">
                        <div className="vh-sec-title">
                            <h2>{channel.channel_title} 채널 분석</h2>
                            <p className="vh-sec-note">
                                최근 30일 Viral Hunter 수집 데이터로 비슷한 규모의 채널과 비교했습니다.
                            </p>
                        </div>
                        <div className="vh-card">
                            {insight.tags.length > 0 && (
                                <div className="vh-tags">
                                    {insight.tags.map((t) => (
                                        <span key={t}>{t}</span>
                                    ))}
                                </div>
                            )}
                            <ul className="vh-bullets">
                                {insight.sentences.map((t) => (
                                    <li key={t}>{t}</li>
                                ))}
                            </ul>
                        </div>
                    </section>
                )}

                {/* 채널 고유 정보 — 그 채널 영상에서 나온 주제와 습관 */}
                {extraView && extraView.sentences.length > 0 && (
                    <section className="vh-sec">
                        <h2 className="vh-sec-h">{withJosa(channel.channel_title, "이가")} 다루는 주제와 업로드 습관</h2>
                        <div className="vh-card">
                            {extraView.topics.length > 0 && (
                                <div className="vh-tags vh-tags-plain">
                                    {extraView.topics.map((t) => (
                                        <span key={t}>#{t}</span>
                                    ))}
                                </div>
                            )}
                            <ul className="vh-lines">
                                {extraView.sentences.map((s) => (
                                    <li key={s}>{s}</li>
                                ))}
                            </ul>
                        </div>
                    </section>
                )}

                {/* 지표 정의는 /about/metrics 한 곳에 둔다.
                    [2026-11-11] 전에는 절반의 채널(SEO 실험 대조군)에 긴 설명이 그대로 붙어 있었다.
                    모든 페이지에 똑같이 붙는 글이라 한 줄 링크로 줄였다. */}
                <p className="vh-chd-note">
                    일평균 증가·성장 지수·순위를 어떻게 계산하는지는{" "}
                    <Link href="/about/metrics">지표 설명</Link>
                    에서 볼 수 있습니다.
                </p>

                {/* 요약 */}
                <section className="vh-sec">
                    <h2 className="vh-sec-h">채널 요약</h2>
                    <div className="vh-card">
                        <p className="vh-prose">{summarySentences.join(" ")}</p>
                    </div>
                </section>

                {/* 추이 차트 */}
                <section className="vh-sec">
                    <div className="vh-sec-title">
                        <h2>최근 성장 추이</h2>
                        <p className="vh-sec-note">실제로 측정된 날의 구독자·조회수 증가량만 표시합니다.</p>
                    </div>
                    {sparkline.length >= 3 ? (
                        <SparklineChart points={sparkline} />
                    ) : (
                        <div className="vh-card vh-empty">
                            {!isCurrent ? (
                                <>
                                    지금 뜨는 채널에 없는 채널은 일별 추이를 보관하지 않습니다.
                                    <br />
                                    <span>새 영상이 다시 수집되어 목록에 오르면 추이가 표시됩니다.</span>
                                </>
                            ) : awaitingBaseline ? (
                                <>
                                    이 채널은 추적을 막 시작해 비교할 이전 측정값이 없습니다.
                                    <br />
                                    <span>하루가 지나 두 번째 측정이 쌓이면 일평균과 추이가 표시됩니다.</span>
                                </>
                            ) : (
                                <>
                                    측정된 날이 {sparkline.length}일뿐이라 추이를 표시하지 않습니다.
                                    <br />
                                    <span>데이터가 더 쌓이면 자동으로 그래프가 나타납니다.</span>
                                </>
                            )}
                        </div>
                    )}
                </section>

                {/* 최근 30일 포착 영상 — 채널마다 다른 제목 목록이라 페이지 고유 내용의 중심이다. */}
                {recentVideos.length > 0 && (
                    <section className="vh-sec">
                        <div className="vh-sec-title">
                            <h2>최근 30일 포착 영상</h2>
                            <p className="vh-sec-note">
                                Viral Hunter가 급상승 후보로 수집한 이 채널의 영상 {recent!.videos_30d}개 중 조회수 상위입니다.
                                조회수는 수집 시점(업로드 후 약 2일 이내) 기준입니다.
                            </p>
                        </div>
                        <ol className="vh-vgrid">
                            {recentVideos.map((v, i) => (
                                <li key={v.id} className="vh-vcard">
                                    {/* 순서 숫자는 썸네일 위에 얹는다. 링크 글자(제목)는 그대로 둔다. */}
                                    <span className="vh-vcard-rk">{i + 1}</span>
                                    <a
                                        href={`https://www.youtube.com/watch?v=${v.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer nofollow"
                                    >
                                        <span className="vh-vcard-th">
                                            <Image
                                                src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
                                                alt={`${v.t} 썸네일`}
                                                fill
                                                sizes="(max-width: 640px) 50vw, 240px"
                                                unoptimized
                                            />
                                        </span>
                                        <span className="vh-vcard-t">{v.t}</span>
                                    </a>
                                    <div className="vh-vcard-m">
                                        {v.d} 업로드 · {v.s ? "숏츠" : "롱폼"} · 조회수 {fmtKr(v.v, "회")}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

                {/* 비슷한 채널 — 같은 카테고리·비슷한 구독자 규모. 채널 페이지끼리의 내부 링크다
                    (구글이 링크를 타고 아직 방문하지 않은 채널 페이지로 넘어가도록). */}
                {related.length > 0 && (
                    <section className="vh-sec">
                        <div className="vh-sec-title">
                            <h2>비슷한 규모의 {channel.main_category} 채널</h2>
                            <p className="vh-sec-note">같은 카테고리에서 구독자 수가 가장 가까운 채널입니다.</p>
                        </div>
                        <ul className="vh-related">
                            {related.map((r) => (
                                <li key={r.channel_id}>
                                    <Link href={`/channel/${r.channel_id}`}>
                                        <b>{r.channel_title}</b>
                                        <span>구독자 {fmtKr(r.subscriber_count, "명")}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* 외부 링크 */}
                <section className="vh-chd-out">
                    <a
                        href={`https://www.youtube.com/channel/${channel.channel_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="vh-cta"
                    >
                        유튜브에서 채널 보기
                    </a>
                    {channel.representative_video_id && (
                        <a
                            href={`https://www.youtube.com/watch?v=${channel.representative_video_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vh-btn-line"
                        >
                            대표 영상 보기
                        </a>
                    )}
                </section>
            </main>
        </>
    );
}
