import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import {
    CATEGORY_META,
    CATEGORY_MIN_RANKED,
    CATEGORY_SLUGS,
    channelLink,
    getCategoryOverview,
    isCategorySlug,
    isNewChannel,
    type CategoryChannel,
} from "@/lib/categories";
import { hasChannelPage } from "@/lib/channel-constants";
import { SITE } from "@/lib/site";
import { MetricsDisclosure } from "@/components/legal";
import { Num } from "@/components/site/rank";

export const dynamic = "force-dynamic";

function fmtKr(n: number, unit = ""): string {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억${unit}`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만${unit}`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천${unit}`;
    return `${n.toLocaleString()}${unit}`;
}

/** 증가량 앞에 + 를 붙인다. 0 이하(구독자가 준 채널)는 그대로 둔다. */
function fmtDelta(n: number, unit: string): string {
    return n > 0 ? `+${fmtKr(n, unit)}` : `${n.toLocaleString()}${unit}`;
}

function pct(n: number, total: number): number {
    return total ? Math.round((n / total) * 100) : 0;
}

/** '2026-10-26' → '10월 26일' */
function dayLabel(d: string): string {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${parseInt(m[2], 10)}월 ${parseInt(m[3], 10)}일` : d;
}

/** '2026-10-26' → '2026년 10월' */
function monthLabel(d: string): string {
    const m = d.match(/^(\d{4})-(\d{2})/);
    return m ? `${m[1]}년 ${parseInt(m[2], 10)}월` : "";
}

const LEAGUE_LABEL: Record<string, string> = {
    SHORTS: "숏츠",
    LONG: "롱폼",
    HYBRID: "혼합",
};

/** 구독자 1만 이상은 채널 분석 페이지로, 그보다 작은 채널은 유튜브로 연결한다. */
function ChannelName({ c }: { c: CategoryChannel }) {
    const { href, external } = channelLink(c);
    if (!external) {
        return (
            <Link href={href} className="vh-chname">
                {c.channel_title}
            </Link>
        );
    }
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="vh-chname">
            {c.channel_title}
            <ExternalLink className="vh-ext" aria-hidden="true" />
            <span className="sr-only">(유튜브에서 열기)</span>
        </a>
    );
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    if (!isCategorySlug(slug)) return { title: "찾을 수 없음", robots: { index: false } };

    const meta = CATEGORY_META[slug];
    const overview = await getCategoryOverview();
    const snap = overview?.categories[slug];
    const first = snap?.top[0];
    const n = snap?.top.length ?? 0;
    const month = overview ? monthLabel(overview.targetDate) : "";

    return {
        title: `${meta.label} 유튜버 순위 TOP ${n} - 요즘 뜨는 채널${month && ` (${month})`}`,
        description:
            `국내 ${meta.label} 유튜브 채널 ${(snap?.tracked ?? 0).toLocaleString()}개 중 ` +
            `최근 하루 평균 조회수가 가장 많이 늘어난 채널 ${n}곳.` +
            (first ? ` 1위 ${first.channel_title}(구독자 ${fmtKr(first.subscriber_count, "명")}).` : "") +
            ` 구독자가 빨리 느는 채널과 새로 생긴 채널도 함께 정리했습니다.`,
        alternates: { canonical: `/category/${slug}` },
        // 순위 채널이 적은 날은 얇은 페이지라 검색에서 뺀다. 링크는 따라가게 둔다.
        ...((snap?.ranked ?? 0) < CATEGORY_MIN_RANKED && { robots: { index: false, follow: true } }),
        openGraph: {
            title: `급상승 ${meta.label} 유튜버 순위 | Viral Hunter`,
            description: meta.description,
            url: `${SITE.url}/category/${slug}`,
            type: "website",
        },
    };
}

export default async function CategoryPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    if (!isCategorySlug(slug)) notFound();

    const meta = CATEGORY_META[slug];
    const overview = await getCategoryOverview();
    const snap = overview?.categories[slug];
    if (!overview || !snap || snap.top.length === 0) notFound();

    const first = snap.top[0];
    const smallInTop = snap.top.filter((c) => !hasChannelPage(c.subscriber_count)).length;
    const others = CATEGORY_SLUGS.filter((s) => s !== slug);

    const itemListLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `급상승 ${meta.label} 유튜버 순위`,
        url: `${SITE.url}/category/${slug}`,
        numberOfItems: snap.top.length,
        itemListElement: snap.top.slice(0, 10).map((c, i) => {
            const { href, external } = channelLink(c);
            return {
                "@type": "ListItem",
                position: i + 1,
                name: c.channel_title,
                url: external ? href : `${SITE.url}${href}`,
            };
        }),
    };

    const breadcrumbLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "카테고리별 순위", item: `${SITE.url}/category` },
            { "@type": "ListItem", position: 2, name: meta.label, item: `${SITE.url}/category/${slug}` },
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

            {/* [2026-10-30] 새 디자인: 모양만 바꿨다. 글·표 내용·링크는 그대로다. */}
            <main className="vh-main vh-narrow">
                <Link href="/category" className="vh-back">
                    <ArrowLeft aria-hidden="true" />
                    카테고리 전체
                </Link>

                <header className="vh-phead">
                    <p className="vh-eyebrow">
                        {meta.label} · {dayLabel(overview.targetDate)} 기준
                    </p>
                    <h1>급상승 {meta.label} 유튜버 순위</h1>
                    <p className="vh-lead">{meta.description}</p>
                    {/* 숫자로 만든 요약. 카테고리마다 값이 달라 페이지마다 다른 문장이 된다. */}
                    <p className="vh-lead vh-lead-sm">
                        국내 {meta.label} 채널{" "}
                        <strong>{snap.tracked.toLocaleString()}개</strong>를
                        추적해 최근 하루 평균 조회수가 많이 늘어난 순으로 세웠습니다. 1위는{" "}
                        <strong>{first.channel_title}</strong>
                        (구독자 {fmtKr(first.subscriber_count, "명")})로 하루 평균 조회수가{" "}
                        <strong>{fmtKr(first.avg_daily_view_increase, "회")}</strong>씩
                        늘고 있습니다. 상위 {snap.top.length}개 중 {smallInTop}개는 구독자 1만 명 미만 채널입니다.
                    </p>
                    {/* YouTube API 정책 III.E.4.h: 자체 계산 지표 고지 */}
                    <MetricsDisclosure />
                </header>

                <dl className="vh-kpis">
                    {[
                        { k: "추적 채널", v: `${snap.tracked.toLocaleString()}개` },
                        { k: "숏츠 중심 채널", v: `${pct(snap.shorts, snap.ranked)}%` },
                        { k: "구독자 중위값", v: fmtKr(snap.medianSubscribers, "명") },
                        { k: "3개월 안에 생긴 채널", v: `${snap.newChannels.toLocaleString()}개` },
                    ].map((s) => (
                        <div key={s.k} className="vh-kpi">
                            <dt>{s.k}</dt>
                            <dd>
                                <Num t={s.v} />
                            </dd>
                        </div>
                    ))}
                </dl>

                <section className="vh-sec">
                    <h2 className="vh-sec-h">
                        하루 평균 조회수가 많이 느는 채널 TOP {snap.top.length}
                    </h2>
                    <div className="vh-table-card">
                        {/* 휴대폰에서는 한 줄을 두 줄 카드로 바꿔 옆으로 밀지 않아도 다 보이게 한다 (형식·일평균 구독자는 둘째 줄). */}
                        <table className="vh-table vh-cattop">
                            <thead>
                                <tr>
                                    <th scope="col">순위</th>
                                    <th scope="col">채널</th>
                                    <th scope="col">형식</th>
                                    <th scope="col" className="vh-num">일평균 조회수</th>
                                    <th scope="col" className="vh-num">일평균 구독자</th>
                                    <th scope="col" className="vh-num">구독자</th>
                                </tr>
                            </thead>
                            <tbody>
                                {snap.top.map((c, i) => (
                                    <tr key={c.channel_id} data-top={i < 3 ? "" : undefined}>
                                        <td className="vh-trk">{i + 1}</td>
                                        <th scope="row">
                                            <ChannelName c={c} />
                                            {isNewChannel(c) && <span className="vh-newage">개설 {c.ageDays}일</span>}
                                        </th>
                                        <td className="vh-tfmt">{LEAGUE_LABEL[c.league_group] ?? "-"}</td>
                                        <td className="vh-num vh-tavg">{fmtDelta(c.avg_daily_view_increase, "회")}</td>
                                        <td className="vh-num vh-tdsub">{fmtDelta(c.avg_daily_sub_increase, "명")}</td>
                                        <td className="vh-num vh-tsubs">{fmtKr(c.subscriber_count, "명")}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="vh-two-even">
                    <section className="vh-sec">
                        <div className="vh-sec-title">
                            <h2>구독자가 가장 빨리 느는 채널</h2>
                            <p className="vh-sec-note">하루 평균 구독자 증가 순</p>
                        </div>
                        <ol className="vh-mlist">
                            {snap.topSubs.map((c, i) => (
                                <li key={c.channel_id}>
                                    <span className="vh-mlist-rk">{i + 1}</span>
                                    <span className="vh-mlist-name"><ChannelName c={c} /></span>
                                    <span className="vh-mlist-v">
                                        <b>{fmtDelta(c.avg_daily_sub_increase, "명")}</b>
                                        <small>/ {fmtKr(c.subscriber_count, "명")}</small>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <section className="vh-sec">
                        <div className="vh-sec-title">
                            <h2>최근 3개월 안에 생긴 채널</h2>
                            <p className="vh-sec-note">개설 90일 이내 채널의 하루 평균 조회수 증가 순</p>
                        </div>
                        {snap.newest.length > 0 ? (
                            <ol className="vh-mlist">
                                {snap.newest.map((c, i) => (
                                    <li key={c.channel_id}>
                                        <span className="vh-mlist-rk">{i + 1}</span>
                                        <span className="vh-mlist-name"><ChannelName c={c} /></span>
                                        <span className="vh-mlist-v">
                                            <b>{fmtDelta(c.avg_daily_view_increase, "회")}</b>
                                            <small>개설 {c.ageDays}일</small>
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="vh-note">
                                지금 순위에는 최근 3개월 안에 생긴 채널이 없습니다.
                            </p>
                        )}
                    </section>
                </div>

                {/* 이 순위가 무엇이고 무엇이 아닌지 밝힌다. '유튜버 순위'를 전체 구독자 순위로 읽으면 오해가 된다. */}
                <div className="vh-note vh-note-stack">
                    <p>
                        이 순위는 Viral Hunter가 <strong>구독자 수 대비 조회 성과가 높은 채널</strong>을
                        골라 추적한 결과입니다. 구독자가 매우 많은 대형 채널은 선별 기준상 들어 있지 않아, 한국 유튜브 전체
                        구독자 순위와는 다릅니다.
                    </p>
                    <p>
                        일평균 조회수·구독자는 최근 최대 7일 동안 채널 전체 조회수·구독자가 하루 평균 늘어난 양입니다.
                        카테고리는 채널이 올린 영상 중 가장 많은 유튜브 분류를 따릅니다. 채널 지표는 매일 저녁 갱신됩니다.{" "}
                        <Link href="/about/metrics">지표 설명</Link>
                    </p>
                    <p>
                        구독자 1만 명 이상 채널은 Viral Hunter 채널 분석 페이지로, 그보다 작은 채널은 유튜브 채널로 연결됩니다.
                    </p>
                </div>

                {/* 다른 카테고리 — 내부 링크 */}
                <section className="vh-sec">
                    <h2 className="vh-sec-h">다른 카테고리 순위</h2>
                    <ul className="vh-chiplist">
                        {others.map((s) => (
                            <li key={s}>
                                <Link href={`/category/${s}`}>{CATEGORY_META[s].label}</Link>
                            </li>
                        ))}
                    </ul>
                </section>
            </main>
        </>
    );
}
