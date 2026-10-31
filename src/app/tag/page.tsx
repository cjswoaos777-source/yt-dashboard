import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTagListPage, tagToSlug, TAG_LIST_PAGE_SIZE } from "@/lib/tags";
import { SITE } from "@/lib/site";
import { MetricsDisclosure } from "@/components/legal";

export const dynamic = "force-dynamic";

function fmtKr(n: number, unit = ""): string {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억${unit}`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만${unit}`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천${unit}`;
    return `${n.toLocaleString()}${unit}`;
}

function parsePage(raw: string | string[] | undefined): number {
    const v = Array.isArray(raw) ? raw[0] : raw;
    const n = Number.parseInt(v ?? "1", 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
}

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
    const page = parsePage((await searchParams).page);
    const { total, totalPages } = await getTagListPage(page);

    if (page > totalPages) {
        return { title: "태그", robots: { index: false, follow: false } };
    }

    const suffix = page > 1 ? ` (${page}/${totalPages}페이지)` : "";
    return {
        title: `지금 뜨는 유튜브 태그 ${total.toLocaleString()}개${suffix}`,
        description:
            `국내 유튜브에서 지금 조회수가 오르고 있는 영상들의 태그 ${total.toLocaleString()}개를 ` +
            `급상승 규모 순으로 정리했습니다. 태그별로 어떤 영상이 뜨고 있는지 확인하세요.`,
        alternates: { canonical: page > 1 ? `/tag?page=${page}` : "/tag" },
        // [2026-10-31] 구글 대청소 마무리: 2쪽부터는 구글에만 내보내지 않는다. 태그 상세가 전부 noindex 라
        //   구글에는 noindex 페이지로만 가는 얇은 목록 96쪽이 남아 있었다. 다음·빙·네이버와 1쪽(/tag)은 그대로다.
        ...(page > 1 && { robots: { index: true, follow: true, googleBot: { index: false, follow: true } } }),
    };
}

export default async function TagIndexPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const page = parsePage((await searchParams).page);
    const { items, total, totalPages } = await getTagListPage(page);

    // 범위 밖 페이지가 200 으로 같은 내용을 반환하면 중복 URL 이 무한히 생긴다.
    if (page > totalPages) {
        notFound();
    }

    const startRank = (page - 1) * TAG_LIST_PAGE_SIZE;

    const itemListLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "지금 뜨는 유튜브 태그",
        url: `${SITE.url}/tag${page > 1 ? `?page=${page}` : ""}`,
        numberOfItems: items.length,
        itemListElement: items.map((t, i) => ({
            "@type": "ListItem",
            position: startRank + i + 1,
            name: t.tag,
            url: `${SITE.url}/tag/${tagToSlug(t.tag)}`,
        })),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
            />

            {/* [2026-10-30] 새 디자인: 모양만 바꿨다. 글·링크는 그대로다. */}
            <main className="vh-main vh-narrow">
                <Link href="/dashboard" className="vh-back">
                    <ArrowLeft aria-hidden="true" />
                    대시보드로
                </Link>

                <header className="vh-phead">
                    <h1>지금 뜨는 유튜브 태그</h1>
                    <p className="vh-lead">
                        국내 영상에 달린 태그{" "}
                        <strong>{total.toLocaleString()}개</strong>
                        를 지금 뜨는 규모 순으로 정렬했습니다. 매시간 갱신됩니다.
                    </p>
                    {/* YouTube API 정책 III.E.4.h: 자체 계산 지표 고지 */}
                    <MetricsDisclosure />
                </header>

                <ul className="vh-chiplist vh-tagcloud">
                    {items.map((t) => (
                        <li key={t.tag}>
                            <Link href={`/tag/${tagToSlug(t.tag)}`}>
                                <span>#{t.tag}</span>
                                <small>
                                    {t.video_count}개 · +{fmtKr(t.total_hourly_increase)}
                                </small>
                            </Link>
                        </li>
                    ))}
                </ul>

                {/* 페이지 이동 — 크롤러가 전체 목록을 따라갈 수 있도록 링크로 제공 */}
                {totalPages > 1 && (
                    <nav aria-label="태그 목록 페이지" className="vh-pager">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <Link
                                key={p}
                                href={p === 1 ? "/tag" : `/tag?page=${p}`}
                                aria-current={p === page ? "page" : undefined}
                            >
                                {p}
                            </Link>
                        ))}
                    </nav>
                )}
            </main>
        </>
    );
}
