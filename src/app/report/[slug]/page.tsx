import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getAllReportSlugs, getReport, type ReportRow } from "@/lib/reports";
import { MetricsDisclosure } from "@/components/legal";
import { SupportBox } from "@/components/support-box";
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

/** "+12%"·"지난주 대비 -5%" 같은 글에서 부호만 보고 색 클래스를 고른다 (글은 그대로) */
function deltaClass(t: string): string {
    const m = t.match(/([+-])\d/);
    return m ? (m[1] === "+" ? "vh-up" : "vh-down") : "";
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
        <div className="vh-table-card">
            <table className="vh-table vh-vtable">
                <thead>
                    <tr>
                        <th className="vh-num">#</th>
                        <th>영상</th>
                        <th>채널</th>
                        <th className="vh-num">구독자</th>
                        {extra === "created" && <th className="vh-num">채널 개설</th>}
                        <th className="vh-num">조회수</th>
                        {extra === "ratio" && <th className="vh-num">구독자 대비</th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={`${r.video_id}-${i}`} data-top={i < 3 ? "" : undefined}>
                            <td className="vh-trk">{i + 1}</td>
                            <td className="vh-vt">
                                <a
                                    href={`https://www.youtube.com/watch?v=${r.video_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow"
                                >
                                    <span className="vh-vt-th">
                                        <Image
                                            src={`https://img.youtube.com/vi/${r.video_id}/mqdefault.jpg`}
                                            alt=""
                                            fill
                                            sizes="96px"
                                            unoptimized
                                        />
                                    </span>
                                    <span className="vh-vt-t">{r.title}</span>
                                </a>
                                <div className="vh-vt-m">
                                    {r.is_shorts ? "숏츠" : "롱폼"} · {r.category} · {r.d?.slice(5).replace("-", "/")} 업로드
                                </div>
                            </td>
                            <td className="vh-vch">{r.channel_title}</td>
                            <td className="vh-num vh-vsub">{fmtKr(r.subs, "명")}</td>
                            {extra === "created" && <td className="vh-num vh-vcr">{r.created}</td>}
                            <td className="vh-num vh-vviews">{fmtKr(r.views, "회")}</td>
                            {extra === "ratio" && (
                                <td className="vh-num vh-vratio">
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
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            {/* [2026-10-30] 새 디자인: 모양만 바꿨다. 글·표 내용·링크는 그대로다. */}
            <main className="vh-main vh-article">
                <Link href="/report" className="vh-back">
                    <ArrowLeft aria-hidden="true" />
                    리포트 목록으로
                </Link>

                {r.status === "draft" && (
                    <div className="vh-alert">
                        검토용 초안입니다. 아직 목록과 검색엔진에 공개되지 않았습니다.
                    </div>
                )}

                <article className="vh-art">
                    <div className="vh-art-meta">
                        <span className="vh-art-tag">주간 트렌드 리포트</span>
                        <span>{periodLabel(data.period_start, data.period_end)}</span>
                    </div>
                    <h1>{r.title}</h1>
                    <p className="vh-lead">{r.summary}</p>

                    <section className="vh-kpis">
                        {stats.map((s) => (
                            <div key={s.label} className="vh-kpi">
                                <small>{s.label}</small>
                                <strong>{s.value}</strong>
                                <span className={deltaClass(s.sub)}>{s.sub}</span>
                            </div>
                        ))}
                    </section>

                    {/* 해석 글 (md) */}
                    <div
                        className="prose-notice vh-md"
                        dangerouslySetInnerHTML={{ __html: r.contentHtml }}
                    />

                    <section className="vh-sec">
                        <div className="vh-sec-title">
                            <h2>카테고리별 흐름</h2>
                            <p className="vh-sec-note">한 주에 50개 이상 수집된 카테고리 · 지난주 대비</p>
                        </div>
                        <div className="vh-table-card">
                            <table className="vh-table vh-cattable">
                                <thead>
                                    <tr>
                                        <th>카테고리</th>
                                        <th className="vh-num">영상 수</th>
                                        <th className="vh-num">변화</th>
                                        <th className="vh-num">숏츠 비중</th>
                                        <th className="vh-num">중간 조회수</th>
                                        <th className="vh-num">변화</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.categories.map((c) => (
                                        <tr key={c.category}>
                                            <th scope="row">{c.category}</th>
                                            <td className="vh-num">{c.n.toLocaleString()}</td>
                                            <td className={`vh-num ${deltaClass(pct(c.n, c.prev_n))}`}>{pct(c.n, c.prev_n)}</td>
                                            <td className="vh-num">{((c.shorts_n / c.n) * 100).toFixed(0)}%</td>
                                            <td className="vh-num vh-tavg">{fmtKr(c.median_views, "회")}</td>
                                            <td className={`vh-num ${deltaClass(pct(c.median_views, c.prev_median_views))}`}>
                                                {pct(c.median_views, c.prev_median_views)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="vh-sec">
                        <div className="vh-sec-title">
                            <h2>이번 주 조회수 TOP 10</h2>
                            <p className="vh-sec-note">이번 주에 올라온 한국어 영상 중 수집 기간 조회수 순</p>
                        </div>
                        <VideoTable rows={data.top_videos} />
                    </section>

                    <section className="vh-sec">
                        <div className="vh-sec-title">
                            <h2>하꼬의 반란 — 구독자 1만 미만 채널</h2>
                            <p className="vh-sec-note">조회수 5만 이상 · 채널당 1개 · 구독자 대비 조회수가 높은 순</p>
                        </div>
                        <VideoTable rows={data.small_channel_hits} extra="ratio" />
                    </section>

                    <section className="vh-sec">
                        <div className="vh-sec-title">
                            <h2>개설 3개월 이내 신규 채널</h2>
                            <p className="vh-sec-note">이번 주 영상이 가장 많이 본 신규 채널 · 채널당 최고 영상</p>
                        </div>
                        <VideoTable rows={data.new_channels} extra="created" />
                    </section>

                    <div className="vh-note">
                        집계 기준: Viral Hunter가 수집한 국내 영상 중 제목에 한글이 있는 영상. 조회수는 업로드 후 약 2일간의
                        수집 기간 중 마지막 값이며, 영상 수는 실제 업로드 수가 아니라 수집량이라 주마다 수집 범위에 따라 달라질 수 있습니다.
                        데이터 생성: {data.generated_at}
                        <MetricsDisclosure className="mt-2" />
                    </div>
                    <SupportBox />
                </article>
            </main>
        </>
    );
}
