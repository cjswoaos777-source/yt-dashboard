import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTagListPage, tagToSlug, TAG_LIST_PAGE_SIZE } from "@/lib/tags";
import { SITE } from "@/lib/site";

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
        <div className="min-h-screen bg-[#FDFDFC]">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
            />

            <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-10">
                <Link
                    href="/dashboard"
                    className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    대시보드로
                </Link>

                <header className="mb-8">
                    <h1
                        className="mb-2 font-serif text-3xl font-bold leading-tight tracking-tight text-[#1A1A1A] md:text-4xl"
                        style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                        지금 뜨는 유튜브 태그
                    </h1>
                    <p className="text-[13px] leading-relaxed text-neutral-500">
                        국내 영상에 달린 태그{" "}
                        <strong className="font-semibold text-neutral-700">
                            {total.toLocaleString()}개
                        </strong>
                        를 지금 뜨는 규모 순으로 정렬했습니다. 매시간 갱신됩니다.
                    </p>
                </header>

                <ul className="flex flex-wrap gap-2">
                    {items.map((t) => (
                        <li key={t.tag}>
                            <Link
                                href={`/tag/${tagToSlug(t.tag)}`}
                                className="inline-flex items-baseline gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-[13px] text-neutral-700 transition-colors hover:bg-neutral-50"
                            >
                                <span className="font-medium">#{t.tag}</span>
                                <span className="text-[11px] tabular-nums text-neutral-400">
                                    {t.video_count}개 · +{fmtKr(t.total_hourly_increase)}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>

                {/* 페이지 이동 — 크롤러가 전체 목록을 따라갈 수 있도록 링크로 제공 */}
                {totalPages > 1 && (
                    <nav
                        aria-label="태그 목록 페이지"
                        className="mt-10 flex flex-wrap items-center justify-center gap-1.5"
                    >
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <Link
                                key={p}
                                href={p === 1 ? "/tag" : `/tag?page=${p}`}
                                aria-current={p === page ? "page" : undefined}
                                className={
                                    p === page
                                        ? "rounded-lg bg-black px-3 py-1.5 text-[12px] font-semibold text-white"
                                        : "rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
                                }
                            >
                                {p}
                            </Link>
                        ))}
                    </nav>
                )}
            </main>
        </div>
    );
}
