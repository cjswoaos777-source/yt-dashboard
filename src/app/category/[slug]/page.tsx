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
    const cls = "text-[#1A1A1A] underline-offset-2 hover:underline";
    if (!external) {
        return (
            <Link href={href} className={cls}>
                {c.channel_title}
            </Link>
        );
    }
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} inline-flex items-center gap-1`}>
            {c.channel_title}
            <ExternalLink className="h-3 w-3 shrink-0 text-neutral-300" aria-hidden="true" />
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
        <div className="min-h-screen bg-[#FDFDFC]">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
            />

            <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-10">
                <Link
                    href="/category"
                    className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    카테고리 전체
                </Link>

                <header className="mb-8">
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                        {meta.label} · {dayLabel(overview.targetDate)} 기준
                    </p>
                    <h1
                        className="mb-3 font-serif text-3xl font-bold leading-tight tracking-tight text-[#1A1A1A] md:text-4xl"
                        style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                        급상승 {meta.label} 유튜버 순위
                    </h1>
                    <p className="mb-3 text-[13.5px] leading-relaxed text-[#333333]">
                        {meta.description}
                    </p>
                    {/* 숫자로 만든 요약. 카테고리마다 값이 달라 페이지마다 다른 문장이 된다. */}
                    <p className="text-[13px] leading-relaxed text-neutral-500">
                        국내 {meta.label} 채널{" "}
                        <strong className="font-semibold text-neutral-700">{snap.tracked.toLocaleString()}개</strong>를
                        추적해 최근 하루 평균 조회수가 많이 늘어난 순으로 세웠습니다. 1위는{" "}
                        <strong className="font-semibold text-neutral-700">{first.channel_title}</strong>
                        (구독자 {fmtKr(first.subscriber_count, "명")})로 하루 평균 조회수가{" "}
                        <strong className="font-semibold text-neutral-700">{fmtKr(first.avg_daily_view_increase, "회")}</strong>씩
                        늘고 있습니다. 상위 {snap.top.length}개 중 {smallInTop}개는 구독자 1만 명 미만 채널입니다.
                    </p>
                    {/* YouTube API 정책 III.E.4.h: 자체 계산 지표 고지 */}
                    <MetricsDisclosure className="mt-3" />
                </header>

                <dl className="mb-10 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                        { k: "추적 채널", v: `${snap.tracked.toLocaleString()}개` },
                        { k: "숏츠 중심 채널", v: `${pct(snap.shorts, snap.ranked)}%` },
                        { k: "구독자 중위값", v: fmtKr(snap.medianSubscribers, "명") },
                        { k: "3개월 안에 생긴 채널", v: `${snap.newChannels.toLocaleString()}개` },
                    ].map((s) => (
                        <div key={s.k} className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                            <dt className="text-[11px] text-neutral-400">{s.k}</dt>
                            <dd className="mt-0.5 text-[17px] font-semibold tabular-nums text-[#1A1A1A]">{s.v}</dd>
                        </div>
                    ))}
                </dl>

                <section>
                    <h2 className="mb-3 text-[15px] font-bold text-[#1A1A1A]">
                        하루 평균 조회수가 많이 느는 채널 TOP {snap.top.length}
                    </h2>
                    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                        <div className="overflow-x-auto">
                            {/* 휴대폰에서는 형식·일평균 구독자 칸을 숨겨 옆으로 밀지 않아도 핵심 숫자가 보이게 한다. */}
                            <table className="w-full text-left text-[13px] sm:min-w-[560px]">
                                <thead>
                                    <tr className="border-b border-neutral-100 text-[11px] text-neutral-400">
                                        <th scope="col" className="whitespace-nowrap px-3 py-2.5 font-medium sm:px-4">순위</th>
                                        <th scope="col" className="px-3 py-2.5 font-medium sm:px-4">채널</th>
                                        <th scope="col" className="hidden whitespace-nowrap px-4 py-2.5 font-medium sm:table-cell">형식</th>
                                        <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-right font-medium sm:px-4">일평균 조회수</th>
                                        <th scope="col" className="hidden whitespace-nowrap px-4 py-2.5 text-right font-medium sm:table-cell">일평균 구독자</th>
                                        <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-right font-medium sm:px-4">구독자</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {snap.top.map((c, i) => (
                                        <tr
                                            key={c.channel_id}
                                            className="border-b border-neutral-50 transition-colors last:border-0 hover:bg-neutral-50/60"
                                        >
                                            <td className="px-3 py-2.5 tabular-nums text-neutral-400 sm:px-4">{i + 1}</td>
                                            <th scope="row" className="px-3 py-2.5 font-medium [overflow-wrap:anywhere] sm:px-4">
                                                <ChannelName c={c} />
                                                {isNewChannel(c) && (
                                                    <span className="ml-1.5 whitespace-nowrap rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600">
                                                        개설 {c.ageDays}일
                                                    </span>
                                                )}
                                            </th>
                                            <td className="hidden whitespace-nowrap px-4 py-2.5 text-[12px] text-neutral-500 sm:table-cell">
                                                {LEAGUE_LABEL[c.league_group] ?? "-"}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-[#1A1A1A] sm:px-4">
                                                {fmtDelta(c.avg_daily_view_increase, "회")}
                                            </td>
                                            <td className="hidden whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-neutral-700 sm:table-cell">
                                                {fmtDelta(c.avg_daily_sub_increase, "명")}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-neutral-500 sm:px-4">
                                                {fmtKr(c.subscriber_count, "명")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <div className="mt-10 grid gap-6 md:grid-cols-2">
                    <section>
                        <h2 className="mb-1 text-[15px] font-bold text-[#1A1A1A]">구독자가 가장 빨리 느는 채널</h2>
                        <p className="mb-3 text-[12px] text-neutral-500">하루 평균 구독자 증가 순</p>
                        <ol className="space-y-1.5">
                            {snap.topSubs.map((c, i) => (
                                <li
                                    key={c.channel_id}
                                    className="flex items-baseline gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[13px]"
                                >
                                    <span className="w-5 shrink-0 text-right text-[12px] tabular-nums text-neutral-400">{i + 1}</span>
                                    <span className="min-w-0 flex-1 truncate font-medium"><ChannelName c={c} /></span>
                                    <span className="shrink-0 text-right">
                                        <span className="font-semibold tabular-nums text-[#1A1A1A]">{fmtDelta(c.avg_daily_sub_increase, "명")}</span>
                                        <span className="ml-1.5 text-[11px] tabular-nums text-neutral-400">/ {fmtKr(c.subscriber_count, "명")}</span>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <section>
                        <h2 className="mb-1 text-[15px] font-bold text-[#1A1A1A]">최근 3개월 안에 생긴 채널</h2>
                        <p className="mb-3 text-[12px] text-neutral-500">개설 90일 이내 채널의 하루 평균 조회수 증가 순</p>
                        {snap.newest.length > 0 ? (
                            <ol className="space-y-1.5">
                                {snap.newest.map((c, i) => (
                                    <li
                                        key={c.channel_id}
                                        className="flex items-baseline gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[13px]"
                                    >
                                        <span className="w-5 shrink-0 text-right text-[12px] tabular-nums text-neutral-400">{i + 1}</span>
                                        <span className="min-w-0 flex-1 truncate font-medium"><ChannelName c={c} /></span>
                                        <span className="shrink-0 text-right">
                                            <span className="font-semibold tabular-nums text-[#1A1A1A]">{fmtDelta(c.avg_daily_view_increase, "회")}</span>
                                            <span className="ml-1.5 text-[11px] tabular-nums text-neutral-400">개설 {c.ageDays}일</span>
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[12px] text-neutral-500">
                                지금 순위에는 최근 3개월 안에 생긴 채널이 없습니다.
                            </p>
                        )}
                    </section>
                </div>

                {/* 이 순위가 무엇이고 무엇이 아닌지 밝힌다. '유튜버 순위'를 전체 구독자 순위로 읽으면 오해가 된다. */}
                <div className="mt-10 space-y-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[12px] leading-relaxed text-neutral-500">
                    <p>
                        이 순위는 Viral Hunter가 <strong className="text-neutral-700">구독자 수 대비 조회 성과가 높은 채널</strong>을
                        골라 추적한 결과입니다. 구독자가 매우 많은 대형 채널은 선별 기준상 들어 있지 않아, 한국 유튜브 전체
                        구독자 순위와는 다릅니다.
                    </p>
                    <p>
                        일평균 조회수·구독자는 최근 최대 7일 동안 채널 전체 조회수·구독자가 하루 평균 늘어난 양입니다.
                        카테고리는 채널이 올린 영상 중 가장 많은 유튜브 분류를 따릅니다. 채널 지표는 매일 저녁 갱신됩니다.{" "}
                        <Link href="/about/metrics" className="text-neutral-700 underline underline-offset-2">
                            지표 설명
                        </Link>
                    </p>
                    <p>
                        구독자 1만 명 이상 채널은 Viral Hunter 채널 분석 페이지로, 그보다 작은 채널은 유튜브 채널로 연결됩니다.
                    </p>
                </div>

                {/* 다른 카테고리 — 내부 링크 */}
                <section className="mt-12 border-t border-neutral-100 pt-8">
                    <h2 className="mb-4 text-[14px] font-bold text-[#1A1A1A]">다른 카테고리 순위</h2>
                    <ul className="flex flex-wrap gap-2">
                        {others.map((s) => (
                            <li key={s}>
                                <Link
                                    href={`/category/${s}`}
                                    className="inline-flex rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[13px] font-medium text-[#1A1A1A] transition-colors hover:bg-neutral-50"
                                >
                                    {CATEGORY_META[s].label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            </main>
        </div>
    );
}
