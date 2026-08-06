import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import {
    getInsights,
    isInsightSlug,
    INSIGHT_REPORTS,
    DOW_LABEL,
    DURATION_LABEL,
    AGE_LABEL,
    type Insights,
} from "@/lib/insights";
import { BarChart, type BarRow } from "../BarChart";
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
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    if (!isInsightSlug(slug)) return { title: "찾을 수 없음", robots: { index: false } };
    const meta = INSIGHT_REPORTS.find((r) => r.slug === slug)!;
    const data = await getInsights();

    const desc = data
        ? `${meta.summary} 국내 유튜브 영상 ${data.sample_size.toLocaleString()}건(최근 ${data.window_days}일)을 집계한 결과입니다.`
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

/** 리포트별 본문. 데이터에서 직접 문장을 만들어 수치와 글이 어긋나지 않게 한다. */
function renderReport(slug: string, d: Insights) {
    if (slug === "upload-time") {
        const hours = [...d.upload_hour].sort((a, b) => b.median_views - a.median_views);
        const best = hours[0];
        const worst = hours[hours.length - 1];
        const busiest = [...d.upload_hour].sort((a, b) => b.videos - a.videos)[0];
        const dows = [...d.day_of_week].sort((a, b) => b.median_views - a.median_views);

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
                <p>
                    가장 성과가 좋은 시간대는 <strong>{best.hour}시</strong>로 중위 조회수{" "}
                    {fmtKr(best.median_views, "회")}였고, 가장 낮은 {worst.hour}시(
                    {fmtKr(worst.median_views, "회")})와{" "}
                    <strong>{(best.median_views / worst.median_views).toFixed(2)}배</strong> 차이가
                    났습니다.
                </p>
                <p>
                    흥미로운 건 <strong>많이 올리는 시간과 잘 되는 시간이 다르다</strong>는
                    점입니다. 업로드가 가장 몰리는 시간은 {busiest.hour}시(
                    {busiest.videos.toLocaleString()}건)인데, 중위 조회수는{" "}
                    {fmtKr(busiest.median_views, "회")}로 {best.hour}시보다 낮았습니다. 경쟁이
                    몰리는 시간대를 피하는 것도 방법입니다.
                </p>
                <h2>시간대별 중위 조회수</h2>
                <BarChart rows={hourRows} caption="시간대별 중위 조회수" />
                <h2>요일은 생각보다 중요하지 않습니다</h2>
                <p>
                    요일별 격차는{" "}
                    <strong>
                        {(dows[0].median_views / dows[dows.length - 1].median_views).toFixed(2)}배
                    </strong>
                    에 그쳤습니다. 가장 높은 {DOW_LABEL[dows[0].dow]}요일과 가장 낮은{" "}
                    {DOW_LABEL[dows[dows.length - 1].dow]}요일의 차이가 크지 않다는 뜻입니다.
                    시간대에 비하면 영향이 훨씬 작으니, 요일을 맞추느라 업로드를 미루는 것보다
                    시간대를 지키는 편이 낫습니다.
                </p>
                <BarChart rows={dowRows} caption="요일별 중위 조회수" />
            </>
        );
    }

    if (slug === "shorts-vs-longform") {
        const s = d.format.find((f) => f.format === "shorts");
        const l = d.format.find((f) => f.format === "longform");
        if (!s || !l) return <p>데이터를 불러오지 못했습니다.</p>;

        const durRows: BarRow[] = d.duration.map((r) => ({
            label: DURATION_LABEL[r.bucket] ?? r.bucket,
            value: r.median_views,
            note: `${r.videos.toLocaleString()}건`,
            highlight: r.bucket === "a_under5",
        }));

        return (
            <>
                <p>
                    조회수만 보면 숏츠가 압도적입니다. 중위 조회수가{" "}
                    <strong>{fmtKr(s.median_views, "회")}</strong>로 롱폼(
                    {fmtKr(l.median_views, "회")})의{" "}
                    <strong>{(s.median_views / l.median_views).toFixed(1)}배</strong>입니다.
                </p>
                <p>
                    그런데 <strong>반응의 깊이는 정반대</strong>입니다. 좋아요 비율은 롱폼이{" "}
                    {l.like_rate}%로 숏츠({s.like_rate}%)의{" "}
                    <strong>{(l.like_rate / s.like_rate).toFixed(1)}배</strong>, 댓글 비율은{" "}
                    {l.comment_rate}%로 숏츠({s.comment_rate}%)의{" "}
                    <strong>{(l.comment_rate / s.comment_rate).toFixed(1)}배</strong>였습니다.
                </p>
                <p>
                    숏츠는 <strong>넓게 퍼지고</strong>, 롱폼은 <strong>깊게 남습니다</strong>.
                    구독 전환이나 팬덤을 원한다면 조회수 숫자만 보고 판단하면 안 됩니다.
                </p>
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
                <p>
                    아닙니다. <strong>5분 미만</strong>이 중위{" "}
                    {fmtKr(d.duration.find((x) => x.bucket === "a_under5")?.median_views ?? 0, "회")}
                    로 가장 높았고, 5분을 넘기면 길이에 따른 차이가 거의 사라집니다. 20분짜리를
                    만든다고 20분만큼 보상받지는 않는다는 뜻입니다.
                </p>
                <BarChart rows={durRows} caption="롱폼 길이별 중위 조회수" />
            </>
        );
    }

    // channel-age
    const ages = d.channel_age;
    const best = [...ages].sort((a, b) => b.avg_daily_views - a.avg_daily_views)[0];
    const oldest = ages.find((a) => a.bucket === "d_over3y");
    const rows: BarRow[] = ages.map((r) => ({
        label: AGE_LABEL[r.bucket] ?? r.bucket,
        value: r.avg_daily_views,
        note: `${r.channels.toLocaleString()}개`,
        highlight: r.bucket === best.bucket,
    }));

    return (
        <>
            <p>
                &ldquo;지금 시작하면 늦었다&rdquo;는 말을 자주 듣습니다. 데이터는 반대였습니다.
                일평균 조회수가 가장 높은 구간은{" "}
                <strong>{AGE_LABEL[best.bucket]}</strong> 채널로{" "}
                {fmtKr(best.avg_daily_views, "회")}였습니다.
            </p>
            {oldest && (
                <p>
                    반면 <strong>3년 이상</strong> 된 채널은 {fmtKr(oldest.avg_daily_views, "회")}로
                    가장 낮았습니다. {AGE_LABEL[best.bucket]} 구간이{" "}
                    <strong>
                        약 {(best.avg_daily_views / oldest.avg_daily_views).toFixed(1)}배
                    </strong>{" "}
                    높은 셈입니다. 구독자는 오래된 채널이 더 많은데도 그렇습니다.
                </p>
            )}
            <h2>채널 나이별 일평균 조회수</h2>
            <BarChart rows={rows} caption="채널 나이별 일평균 조회수" />
            <h2>구독자가 많다고 조회수가 따라오지 않습니다</h2>
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
            <p>
                오래된 채널일수록 중위 구독자는 많지만 일평균 조회수는 낮습니다. 알고리즘이
                채널의 연차가 아니라 <strong>지금 이 영상의 반응</strong>을 본다는 뜻으로 읽힙니다.
            </p>
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

    const articleLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: meta.title,
        description: meta.summary,
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
        <div className="min-h-screen bg-[#FDFDFC]">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

            <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
                <Link
                    href="/insights"
                    className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    인사이트 목록
                </Link>

                <header className="mb-8">
                    <h1
                        className="mb-3 font-serif text-3xl font-bold leading-tight tracking-tight text-[#1A1A1A] md:text-4xl"
                        style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                        {meta.title}
                    </h1>
                    <p className="text-[12px] text-neutral-400">
                        국내 영상 {data.sample_size.toLocaleString()}건 · 최근 {data.window_days}일 ·
                        조회수 {data.min_views.toLocaleString()}회 이상 · {data.generated_at} 집계
                    </p>
                </header>

                <article className="prose-insight space-y-5 text-[15px] leading-[1.85] text-[#333333] [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[#1A1A1A] [&_strong]:font-semibold [&_strong]:text-[#1A1A1A]">
                    {renderReport(slug, data)}
                </article>

                <section className="mt-14 border-t border-neutral-100 pt-8">
                    <h2 className="mb-4 text-[14px] font-bold text-[#1A1A1A]">다른 리포트</h2>
                    <ul className="space-y-2">
                        {others.map((r) => (
                            <li key={r.slug}>
                                <Link
                                    href={`/insights/${r.slug}`}
                                    className="block rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:bg-neutral-50"
                                >
                                    <p className="text-[14px] font-medium text-[#1A1A1A]">{r.title}</p>
                                    <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                                        {r.summary}
                                    </p>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            </main>
        </div>
    );
}
