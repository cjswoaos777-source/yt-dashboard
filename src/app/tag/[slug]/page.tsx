import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTag, tagToSlug } from "@/lib/tags";
import { SITE } from "@/lib/site";
import { MetricsDisclosure } from "@/components/legal";

// 태그가 2,600개가 넘고 수치가 매시간 바뀌므로 빌드 시 전량 프리렌더하지 않는다.
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
    const data = await getTag(decodeURIComponent(slug));
    if (!data) return { title: "태그를 찾을 수 없습니다", robots: { index: false } };

    const { entry } = data;
    return {
        title: `${entry.tag} 유튜브 급상승 영상 ${entry.video_count}개`,
        description:
            `'${entry.tag}' 태그가 달린 국내 유튜브 영상 중 지금 조회수가 오르고 있는 ` +
            `${entry.video_count}개를 모았습니다. 시간당 조회수 증가 순으로 정렬되며 매시간 갱신됩니다.`,
        // 태그 셋은 하루 ~45%가 물갈이된다. 색인 후 404 가 되는 것을 막기 위해 색인 제외.
        robots: { index: false, follow: true },
        alternates: { canonical: `/tag/${slug}` },
        openGraph: {
            title: `${entry.tag} 급상승 영상 | Viral Hunter`,
            description: `'${entry.tag}' 태그의 지금 뜨는 국내 유튜브 영상 ${entry.video_count}개.`,
            url: `${SITE.url}/tag/${slug}`,
            type: "website",
        },
    };
}

export default async function TagDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const data = await getTag(decodeURIComponent(slug));

    if (!data) {
        notFound();
    }

    const { entry, related } = data;

    const itemListLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${entry.tag} 급상승 영상`,
        url: `${SITE.url}/tag/${slug}`,
        numberOfItems: entry.videos.length,
        itemListElement: entry.videos.slice(0, 10).map((v, i) => ({
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
            { "@type": "ListItem", position: 1, name: "태그", item: `${SITE.url}/tag` },
            { "@type": "ListItem", position: 2, name: entry.tag, item: `${SITE.url}/tag/${slug}` },
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
                <Link href="/tag" className="vh-back">
                    <ArrowLeft aria-hidden="true" />
                    태그 목록으로
                </Link>

                <header className="vh-phead">
                    <h1>#{entry.tag}</h1>
                    <p className="vh-lead">
                        이 태그가 달린 국내 영상 중 지금 조회수가 오르고 있는{" "}
                        <strong>{entry.video_count}개</strong>
                        입니다. 합계 시간당{" "}
                        <strong>+{fmtKr(entry.total_hourly_increase, "회")}</strong>
                        . 매시간 갱신됩니다.
                    </p>
                    {/* YouTube API 정책 III.E.4.h: 자체 계산 지표 고지 */}
                    <MetricsDisclosure />
                </header>

                {/* 영상 목록 */}
                <ol className="vh-list">
                    {entry.videos.map((v, i) => (
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

                {/* 관련 태그 — 크롤러가 다른 태그 페이지로 이동할 경로 */}
                {related.length > 0 && (
                    <section className="vh-sec">
                        <h2 className="vh-sec-h">관련 태그</h2>
                        <ul className="vh-chiplist">
                            {related.map((t) => (
                                <li key={t}>
                                    <Link href={`/tag/${tagToSlug(t)}`}>#{t}</Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </main>
        </>
    );
}
