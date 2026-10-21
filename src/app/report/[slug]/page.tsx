import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getAllReportSlugs, getReport, type ReportRow } from "@/lib/reports";
import { MetricsDisclosure } from "@/components/legal";
import { SITE } from "@/lib/site";

export async function generateStaticParams() {
    return getAllReportSlugs().map((slug) => ({ slug }));
}

function fmtKr(n: number | null | undefined, unit = ""): string {
    if (n == null) return "—";
    const abs = Math.abs(n);
    if (abs >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억${unit}`;
    if (abs >= 10_000) return `${(n / 10_000).toFixed(1)}만${unit}`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}천${unit}`;
    return `${n.toLocaleString()}${unit}`;
}

function pct(cur: number, prev: number): string {
    if (!prev) return "—";
    const p = ((cur - prev) / prev) * 100;
    return `${p > 0 ? "+" : ""}${p.toFixed(0)}%`;
}

function periodLabel(start: string, end: string): string {
    const f = (d: string) => d.slice(5).replace("-", ".");
    return `${start.slice(0, 4)}.${f(start)} ~ ${f(end)}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const r = await getReport(slug);
    if (!r) return { title: "주간 트렌드 리포트", robots: { index: false } };
    return {
        title: r.title,
        description: r.summary,
        alternates: { canonical: `/report/${slug}` },
        // 초안은 검토용이라 색인하지 않는다
        robots: { index: r.status === "published", follow: true },
        openGraph: {
            title: `${r.title} | Viral Hunter`,
            description: r.summary,
            url: `/report/${slug}`,
            type: "article",
            publishedTime: r.date,
        },
    };
}

function VideoTable({ rows, extra }: { rows: ReportRow[]; extra?: "ratio" | "created" }) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
            <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead className="border-b border-neutral-100 text-[11px] text-neutral-400">
                    <tr>
                        <th className="w-8 px-3 py-2 text-right">#</th>
                        <th className="px-3 py-2">영상</th>
                        <th className="px-3 py-2">채널</th>
                        <th className="px-3 py-2 text-right">구독자</th>
                        {extra === "created" && <th className="px-3 py-2 text-right">채널 개설</th>}
                        <th className="px-3 py-2 text-right">조회수</th>
                        {extra === "ratio" && <th className="px-3 py-2 text-right">구독자 대비</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                    {rows.map((r, i) => (
                        <tr key={`${r.video_id}-${i}`}>
                            <td className="px-3 py-2.5 text-right text-neutral-400">{i + 1}</td>
                            <td className="px-3 py-2.5">
                                <a
                                    href={`https://www.youtube.com/watch?v=${r.video_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow"
                                    className="font-medium text-[#1A1A1A] hover:underline"
                                >
                                    {r.title}
                                </a>
                                <div className="mt-0.5 text-[11px] text-neutral-400">
                                    {r.is_shorts ? "숏츠" : "롱폼"} · {r.category} · {r.d?.slice(5).replace("-", "/")} 업로드
                                </div>
                            </td>
                            <td className="px-3 py-2.5 text-neutral-600">{r.channel_title}</td>
                            <td className="px-3 py-2.5 text-right text-neutral-600">{fmtKr(r.subs, "명")}</td>
                            {extra === "created" && <td className="px-3 py-2.5 text-right text-neutral-600">{r.created}</td>}
                            <td className="px-3 py-2.5 text-right font-semibold">{fmtKr(r.views, "회")}</td>
                            {extra === "ratio" && (
                                <td className="px-3 py-2.5 text-right font-semibold text-orange-600">
                                    {r.ratio != null ? `${Math.round(r.ratio).toLocaleString()}배` : "—"}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const r = await getReport(slug);
    if (!r) notFound();
    const { data } = r;
    const cur = data.totals.cur;
    const prev = data.totals.prev;
    const fmt = (wk: "cur" | "prev", shorts: boolean) => data.format.find((f) => f.wk === wk && f.is_shorts === shorts);

    const stats = [
        { label: "수집된 한국어 영상", value: fmtKr(cur.videos, "개"), sub: `지난주 대비 ${pct(cur.videos, prev.videos)}` },
        { label: "숏츠 비중", value: `${((cur.shorts / cur.videos) * 100).toFixed(0)}%`, sub: `지난주 ${((prev.shorts / prev.videos) * 100).toFixed(0)}%` },
        { label: "숏츠 중간 조회수", value: fmtKr(fmt("cur", true)?.median_views, "회"), sub: `지난주 대비 ${pct(fmt("cur", true)?.median_views ?? 0, fmt("prev", true)?.median_views ?? 0)}` },
        { label: "롱폼 중간 조회수", value: fmtKr(fmt("cur", false)?.median_views, "회"), sub: `지난주 대비 ${pct(fmt("cur", false)?.median_views ?? 0, fmt("prev", false)?.median_views ?? 0)}` },
    ];

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: r.title,
        description: r.summary,
        datePublished: r.date,
        dateModified: r.date,
        author: { "@type": "Organization", name: SITE.name },
        publisher: { "@type": "Organization", name: SITE.name },
        mainEntityOfPage: `${SITE.url}/report/${slug}`,
    };

    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
                <Link
                    href="/report"
                    className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    리포트 목록으로
                </Link>

                {r.status === "draft" && (
                    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-[12px] text-amber-800">
                        검토용 초안입니다. 아직 목록과 검색엔진에 공개되지 않았습니다.
                    </div>
                )}

                <article>
                    <div className="mb-4 flex flex-wrap items-center gap-3 text-[12px] font-medium text-neutral-400">
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                            주간 트렌드 리포트
                        </span>
                        <span>{periodLabel(data.period_start, data.period_end)}</span>
                    </div>
                    <h1
                        className="mb-4 font-serif text-3xl font-bold leading-tight tracking-tight text-[#1A1A1A] md:text-4xl"
                        style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                        {r.title}
                    </h1>
                    <p className="mb-8 text-[15px] leading-relaxed text-neutral-500">{r.summary}</p>

                    <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {stats.map((s) => (
                            <div key={s.label} className="rounded-2xl border border-neutral-200 bg-white p-4">
                                <div className="text-[11px] font-medium text-neutral-400">{s.label}</div>
                                <div className="mt-1 text-[18px] font-bold text-[#1A1A1A]">{s.value}</div>
                                <div className="mt-0.5 text-[11px] text-neutral-400">{s.sub}</div>
                            </div>
                        ))}
                    </section>

                    {/* 해석 글 (md) */}
                    <div
                        className="prose-notice mb-12 text-[15px] leading-relaxed text-[#333333]"
                        dangerouslySetInnerHTML={{ __html: r.contentHtml }}
                    />

                    <section className="mb-12">
                        <h2 className="mb-1 text-[17px] font-bold text-[#1A1A1A]">카테고리별 흐름</h2>
                        <p className="mb-4 text-[12px] text-neutral-400">한 주에 50개 이상 수집된 카테고리 · 지난주 대비</p>
                        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
                            <table className="w-full min-w-[520px] text-left text-[13px]">
                                <thead className="border-b border-neutral-100 text-[11px] text-neutral-400">
                                    <tr>
                                        <th className="px-3 py-2">카테고리</th>
                                        <th className="px-3 py-2 text-right">영상 수</th>
                                        <th className="px-3 py-2 text-right">변화</th>
                                        <th className="px-3 py-2 text-right">숏츠 비중</th>
                                        <th className="px-3 py-2 text-right">중간 조회수</th>
                                        <th className="px-3 py-2 text-right">변화</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {data.categories.map((c) => (
                                        <tr key={c.category}>
                                            <td className="px-3 py-2.5 font-medium">{c.category}</td>
                                            <td className="px-3 py-2.5 text-right">{c.n.toLocaleString()}</td>
                                            <td className="px-3 py-2.5 text-right text-neutral-500">{pct(c.n, c.prev_n)}</td>
                                            <td className="px-3 py-2.5 text-right text-neutral-500">{((c.shorts_n / c.n) * 100).toFixed(0)}%</td>
                                            <td className="px-3 py-2.5 text-right font-semibold">{fmtKr(c.median_views, "회")}</td>
                                            <td className="px-3 py-2.5 text-right text-neutral-500">{pct(c.median_views, c.prev_median_views)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="mb-12">
                        <h2 className="mb-1 text-[17px] font-bold text-[#1A1A1A]">이번 주 조회수 TOP 10</h2>
                        <p className="mb-4 text-[12px] text-neutral-400">이번 주에 올라온 한국어 영상 중 수집 기간 조회수 순</p>
                        <VideoTable rows={data.top_videos} />
                    </section>

                    <section className="mb-12">
                        <h2 className="mb-1 text-[17px] font-bold text-[#1A1A1A]">하꼬의 반란 — 구독자 1만 미만 채널</h2>
                        <p className="mb-4 text-[12px] text-neutral-400">조회수 5만 이상 · 채널당 1개 · 구독자 대비 조회수가 높은 순</p>
                        <VideoTable rows={data.small_channel_hits} extra="ratio" />
                    </section>

                    <section className="mb-12">
                        <h2 className="mb-1 text-[17px] font-bold text-[#1A1A1A]">개설 3개월 이내 신규 채널</h2>
                        <p className="mb-4 text-[12px] text-neutral-400">이번 주 영상이 가장 많이 본 신규 채널 · 채널당 최고 영상</p>
                        <VideoTable rows={data.new_channels} extra="created" />
                    </section>

                    <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-[12px] leading-relaxed text-neutral-500">
                        집계 기준: Viral Hunter가 수집한 국내 영상 중 제목에 한글이 있는 영상. 조회수는 업로드 후 약 2일간의
                        수집 기간 중 마지막 값이며, 영상 수는 실제 업로드 수가 아니라 수집량이라 주마다 수집 범위에 따라 달라질 수 있습니다.
                        데이터 생성: {data.generated_at}
                        <MetricsDisclosure className="mt-2" />
                    </div>
                </article>
            </main>
        </div>
    );
}
