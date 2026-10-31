import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import {
    getInsights,
    isInsightSlug,
    insightSummary,
    INSIGHT_REPORTS,
    DOW_LABEL,
    DURATION_LABEL,
    AGE_LABEL,
    type Insights,
} from "@/lib/insights";
import { uploadTimeText, formatText, channelAgeText } from "@/lib/insight-text";
import { BarChart, type BarRow } from "../BarChart";
import { SITE } from "@/lib/site";
import { MetricsDisclosure } from "@/components/legal";

export const dynamic = "force-dynamic";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    if (!isInsightSlug(slug)) return { title: "찾을 수 없음", robots: { index: false } };
    const meta = INSIGHT_REPORTS.find((r) => r.slug === slug)!;
    const data = await getInsights();

    // "국내 유튜브 영상 N건"만 쓰면 전수 조사로 읽히므로 수집 범위임을 밝힌다.
    const desc = data
        ? `${insightSummary(slug, data)} 수집된 국내 영상 ${data.sample_size.toLocaleString()}건(최근 ${data.window_days}일) 기준입니다.`
        : meta.summary;

    return {
        title: meta.title,
        description: desc,
        alternates: { canonical: `/insights/${slug}` },
        openGraph: {
            title: `${meta.title} | Viral Hunter`,
            description: desc,
            url: `${SITE.url}/insights/${slug}`,
            type: "article",
        },
    };
}

/** insight-text 문장의 **…** 를 굵게 보여 준다. */
function Rich({ text }: { text: string }) {
    return <>{text.split("**").map((t, i) => (i % 2 ? <strong key={i}>{t}</strong> : t))}</>;
}

/**
 * 리포트별 본문. 데이터에서 직접 문장을 만들어 수치와 글이 어긋나지 않게 한다.
 * [2026-10-31] 숫자만 데이터에서 넣고 결론('정반대', '가장 낮았다')은 글로 박아 둬서 표본이 바뀌자 틀렸다.
 * 결론 문장도 insight-text.ts 가 그날 숫자를 보고 고른다.
 */
function renderReport(slug: string, d: Insights) {
    if (slug === "upload-time") {
        const best = [...d.upload_hour].sort((a, b) => b.median_views - a.median_views)[0];
        const dows = [...d.day_of_week].sort((a, b) => b.median_views - a.median_views);
        const t = uploadTimeText(d);

        const hourRows: BarRow[] = [...d.upload_hour]
            .sort((a, b) => a.hour - b.hour)
            .map((r) => ({
                label: `${r.hour}시`,
                value: r.median_views,
                note: `${r.videos.toLocaleString()}건`,
                highlight: r.hour === best.hour,
            }));
        const dowRows: BarRow[] = d.day_of_week.map((r) => ({
            label: DOW_LABEL[r.dow],
            value: r.median_views,
            note: `${r.videos.toLocaleString()}건`,
            highlight: r.dow === dows[0].dow,
        }));

        return (
            <>
                <p><Rich text={t.p1} /></p>
                <p><Rich text={t.p2} /></p>
                <h2>시간대별 중위 조회수</h2>
                <BarChart rows={hourRows} caption="시간대별 중위 조회수" />
                <h2>{t.dowTitle}</h2>
                <p><Rich text={t.p3} /></p>
                <BarChart rows={dowRows} caption="요일별 중위 조회수" />
            </>
        );
    }

    if (slug === "shorts-vs-longform") {
        const s = d.format.find((f) => f.format === "shorts");
        const l = d.format.find((f) => f.format === "longform");
        if (!s || !l) return <p>데이터를 불러오지 못했습니다.</p>;
        const t = formatText(s, l, d.duration);

        const durRows: BarRow[] = d.duration.map((r) => ({
            label: DURATION_LABEL[r.bucket] ?? r.bucket,
            value: r.median_views,
            note: `${r.videos.toLocaleString()}건`,
            highlight: r.bucket === t.durationBest,
        }));

        return (
            <>
                <p><Rich text={t.p1} /></p>
                <p><Rich text={t.p2} /></p>
                {t.p3 && <p><Rich text={t.p3} /></p>}
                <h2>형식별 지표</h2>
                <div className="not-prose overflow-x-auto">
                    <table className="w-full min-w-[420px] border-collapse text-left text-[13px]">
                        <thead>
                            <tr className="border-b border-neutral-200 text-[11px] text-neutral-400">
                                <th className="py-2 pr-4 font-medium">형식</th>
                                <th className="py-2 pr-4 text-right font-medium">영상 수</th>
                                <th className="py-2 pr-4 text-right font-medium">중위 조회수</th>
                                <th className="py-2 pr-4 text-right font-medium">좋아요율</th>
                                <th className="py-2 text-right font-medium">댓글율</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { name: "숏츠", r: s },
                                { name: "롱폼", r: l },
                            ].map(({ name, r }) => (
                                <tr key={name} className="border-b border-neutral-50 last:border-0">
                                    <th scope="row" className="py-2 pr-4 font-medium text-[#1A1A1A]">
                                        {name}
                                    </th>
                                    <td className="py-2 pr-4 text-right tabular-nums text-neutral-600">
                                        {r.videos.toLocaleString()}
                                    </td>
                                    <td className="py-2 pr-4 text-right tabular-nums text-neutral-600">
                                        {r.median_views.toLocaleString()}
                                    </td>
                                    <td className="py-2 pr-4 text-right tabular-nums text-neutral-600">
                                        {r.like_rate}%
                                    </td>
                                    <td className="py-2 text-right tabular-nums text-neutral-600">
                                        {r.comment_rate}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <h2>롱폼은 길이가 길수록 유리할까</h2>
                <p><Rich text={t.p4} /></p>
                <BarChart rows={durRows} caption="롱폼 길이별 중위 조회수" />
            </>
        );
    }

    // channel-age
    const ages = d.channel_age;
    const t = channelAgeText(ages);
    const rows: BarRow[] = ages.map((r) => ({
        label: AGE_LABEL[r.bucket] ?? r.bucket,
        value: r.avg_daily_views,
        note: `${r.channels.toLocaleString()}개`,
        highlight: r.bucket === t.best.bucket,
    }));

    return (
        <>
            <p><Rich text={t.p1} /></p>
            {t.p2 && <p><Rich text={t.p2} /></p>}
            <h2>채널 나이별 일평균 조회수</h2>
            <BarChart rows={rows} caption="채널 나이별 일평균 조회수" />
            <h2>{t.tableTitle}</h2>
            <div className="not-prose overflow-x-auto">
                <table className="w-full min-w-[380px] border-collapse text-left text-[13px]">
                    <thead>
                        <tr className="border-b border-neutral-200 text-[11px] text-neutral-400">
                            <th className="py-2 pr-4 font-medium">채널 나이</th>
                            <th className="py-2 pr-4 text-right font-medium">채널 수</th>
                            <th className="py-2 pr-4 text-right font-medium">일평균 조회수</th>
                            <th className="py-2 text-right font-medium">중위 구독자</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ages.map((r) => (
                            <tr key={r.bucket} className="border-b border-neutral-50 last:border-0">
                                <th scope="row" className="py-2 pr-4 font-medium text-[#1A1A1A]">
                                    {AGE_LABEL[r.bucket] ?? r.bucket}
                                </th>
                                <td className="py-2 pr-4 text-right tabular-nums text-neutral-600">
                                    {r.channels.toLocaleString()}
                                </td>
                                <td className="py-2 pr-4 text-right tabular-nums text-neutral-600">
                                    {r.avg_daily_views.toLocaleString()}
                                </td>
                                <td className="py-2 text-right tabular-nums text-neutral-600">
                                    {r.median_subs.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p><Rich text={t.p3} /></p>
        </>
    );
}

export default async function InsightReportPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    if (!isInsightSlug(slug)) notFound();

    const meta = INSIGHT_REPORTS.find((r) => r.slug === slug)!;
    const data = await getInsights();
    if (!data) notFound();

    const others = INSIGHT_REPORTS.filter((r) => r.slug !== slug);
    // 아래 '이렇게 읽어야 합니다'의 예시 시각. 예전엔 21시로 박혀 있어 가장 잘 된 시간처럼 읽혔다.
    const bestHour = [...data.upload_hour].sort((a, b) => b.median_views - a.median_views)[0]?.hour ?? 21;

    const articleLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: meta.title,
        description: insightSummary(slug, data),
        author: { "@type": "Organization", name: SITE.name },
        publisher: { "@type": "Organization", name: SITE.name },
        mainEntityOfPage: `${SITE.url}/insights/${slug}`,
    };
    const breadcrumbLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "인사이트", item: `${SITE.url}/insights` },
            { "@type": "ListItem", position: 2, name: meta.title, item: `${SITE.url}/insights/${slug}` },
        ],
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

            {/* [2026-10-30] 새 디자인: 모양만 바꿨다. 글·링크는 그대로다. */}
            <main className="vh-main vh-article">
                <Link href="/insights" className="vh-back">
                    <ArrowLeft aria-hidden="true" />
                    인사이트 목록
                </Link>

                <header className="vh-phead">
                    <h1>{meta.title}</h1>
                    <p className="vh-art-meta">
                        수집된 국내 영상 {data.sample_size.toLocaleString()}건 · 최근{" "}
                        {data.window_days}일 · {data.generated_at} 집계 · 매일 1회 갱신
                    </p>
                    {/* YouTube API 정책 III.E.4.h: 자체 계산 지표 고지 */}
                    <MetricsDisclosure />
                </header>

                {/* 집계 기준을 먼저 밝힌다. "국내 영상 N건"만 쓰면 한국 유튜브 전수로
                    읽히는데, 실제로는 이 서비스가 수집한 범위 안의 표본이다. */}
                <details className="vh-card vh-defs vh-ins-how">
                    <summary>
                        이 숫자는 무엇을 집계한 것인가요?
                    </summary>
                    <div className="vh-ins-how-body">
                        <p>
                            <strong className="text-[#1A1A1A]">한국 유튜브 전체가 아닙니다.</strong>{" "}
                            이 서비스가 매일 수집한 영상 중 국내로 분류된 최근 {data.window_days}일치{" "}
                            {data.sample_size.toLocaleString()}건(채널 약 4만 개)을 집계했습니다.
                        </p>
                        {/* [2026-10-31] 실제 수집기(utube_rank agents/collector.py)에 맞춤: 15개 카테고리(CATEGORY_SPECS),
                            그 전 이틀(COLLECT_DAYS=2) + 매시간 최근 3시간, 조각마다 최대 500개, 하한은 검색의 영상 길이
                            구분(4분 미만 3만·4분 이상 1만). 채널 수는 국내 30일 표본 실측 40,089곳. */}
                        <p className="font-medium text-[#1A1A1A]">수집 방식</p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>
                                매일 오후 5시에 그 전 이틀 동안 올라온 영상을 대상으로, 15개 카테고리 × 영상 길이 × 시간 구간을
                                나눠 유튜브 검색 API를 호출합니다(지역 한국, 언어 한국어). 매시간 최근 3시간 안에 올라온 영상도
                                같은 방식으로 더 찾습니다.
                            </li>
                            <li>
                                각 구간에서 <strong className="text-[#1A1A1A]">조회수가 높은
                                순</strong>으로 최대 500개까지 가져옵니다.
                            </li>
                            <li>
                                수집 시점에 조회수 하한이 걸립니다 —{" "}
                                <strong className="text-[#1A1A1A]">4분 미만 영상 3만 회, 4분 이상 1만 회</strong>.
                            </li>
                        </ul>
                        <p className="font-medium text-[#1A1A1A]">그래서 이렇게 읽어야 합니다</p>
                        <p>
                            무작위 표본이 아니라{" "}
                            <strong className="text-[#1A1A1A]">이미 어느 정도 조회수가 나온
                            영상들</strong>의 모음입니다. 예를 들어 &ldquo;{bestHour}시에 올리면 잘
                            된다&rdquo;가 아니라, &ldquo;성과가 난 영상들 중에서는 {bestHour}시 업로드의
                            중위 조회수가 높았다&rdquo;가 정확한 표현입니다. 묻히는 영상은 애초에
                            표본에 들어오지 않으므로 생존 편향이 있습니다.
                        </p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>
                                국내/해외 구분은 오디오 언어를 우선 판정하고, 언어 정보가 없으면
                                제목의 한글 비율로 추정하므로 일부 오차가 있습니다.
                            </li>
                            <li>
                                평균 대신 중위값을 씁니다. 평균은 초대박 영상 하나에 크게
                                끌려갑니다.
                            </li>
                        </ul>
                        <p>
                            정리하면 이 수치는{" "}
                            <strong className="text-[#1A1A1A]">경향을 참고하는 자료</strong>이지
                            한국 유튜브의 확정된 통계는 아닙니다.
                        </p>
                    </div>
                </details>

                <article className="vh-md vh-insight">
                    {renderReport(slug, data)}
                </article>

                <section className="vh-sec">
                    <h2 className="vh-sec-h">다른 리포트</h2>
                    <ul className="vh-replist">
                        {others.map((r) => (
                            <li key={r.slug}>
                                <Link href={`/insights/${r.slug}`}>
                                    <p className="vh-replist-t">{r.title}</p>
                                    <p>
                                        {insightSummary(r.slug, data)}
                                    </p>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            </main>
        </>
    );
}
