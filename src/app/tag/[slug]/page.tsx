import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { getTag, tagToSlug } from "@/lib/tags";
import { SITE } from "@/lib/site";

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
        <div className="min-h-screen bg-[#FDFDFC]">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
            />

            <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
                <Link
                    href="/tag"
                    className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    태그 목록으로
                </Link>

                <header className="mb-8">
                    <h1
                        className="mb-3 font-serif text-3xl font-bold leading-tight tracking-tight text-[#1A1A1A] md:text-4xl"
                        style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                        #{entry.tag}
                    </h1>
                    <p className="text-[13px] leading-relaxed text-neutral-500">
                        이 태그가 달린 국내 영상 중 지금 조회수가 오르고 있는{" "}
                        <strong className="font-semibold text-neutral-700">
                            {entry.video_count}개
                        </strong>
                        입니다. 합계 시간당{" "}
                        <strong className="font-semibold text-neutral-700">
                            +{fmtKr(entry.total_hourly_increase, "회")}
                        </strong>
                        . 매시간 갱신됩니다.
                    </p>
                </header>

                {/* 영상 목록 */}
                <ol className="space-y-2">
                    {entry.videos.map((v, i) => (
                        <li
                            key={v.video_id}
                            className="rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:bg-neutral-50/60"
                        >
                            <div className="flex items-start gap-3">
                                <span className="mt-0.5 w-6 shrink-0 text-right text-[12px] tabular-nums text-neutral-400">
                                    {i + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <a
                                        href={`https://www.youtube.com/watch?v=${v.video_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[14px] font-medium leading-snug text-[#1A1A1A] underline-offset-2 hover:underline"
                                    >
                                        {v.title}
                                    </a>
                                    <p className="mt-1 text-[12px] text-neutral-500">
                                        {v.channel_title}
                                        <span className="mx-1.5 text-neutral-300">·</span>
                                        {v.video_type}
                                        <span className="mx-1.5 text-neutral-300">·</span>
                                        {v.category_name}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums text-[#1A1A1A]">
                                        <TrendingUp className="h-3 w-3 text-orange-500" />
                                        +{fmtKr(v.hourly_view_increase)}
                                    </p>
                                    <p className="text-[11px] tabular-nums text-neutral-400">
                                        누적 {fmtKr(v.total_views)}
                                    </p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>

                {/* 관련 태그 — 크롤러가 다른 태그 페이지로 이동할 경로 */}
                {related.length > 0 && (
                    <section className="mt-12 border-t border-neutral-100 pt-8">
                        <h2 className="mb-4 text-[14px] font-bold text-[#1A1A1A]">관련 태그</h2>
                        <ul className="flex flex-wrap gap-2">
                            {related.map((t) => (
                                <li key={t}>
                                    <Link
                                        href={`/tag/${tagToSlug(t)}`}
                                        className="inline-block rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12px] text-neutral-700 transition-colors hover:bg-neutral-50"
                                    >
                                        #{t}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </main>
        </div>
    );
}
