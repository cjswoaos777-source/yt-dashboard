import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import {
    getChannelListPage,
    getNewlyTrackedChannels,
    CHANNEL_LIST_PAGE_SIZE,
    CHANNEL_PAGE_MIN_SUBSCRIBERS,
} from "@/lib/channels";
import { SITE } from "@/lib/site";

// 채널 집계는 daily_tier_snapshot 의 오늘 파티션을 전제로 하는데, 그 파티션은
// Flow A(매일 17:01 KST)가 만든다. 그래서 자정~17시 사이에는 갱신이 일어나지 않고
// 전날 값이 유지된다. 수치는 계속 바뀔 수 있으므로 SSR 은 유지한다.
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
    const { total, totalPages } = await getChannelListPage(page);

    // 범위 밖 페이지는 본문에서 404 처리되므로 색인 대상에서 제외한다.
    if (page > totalPages) {
        return { title: "채널 순위", robots: { index: false, follow: false } };
    }

    const suffix = page > 1 ? ` (${page}/${totalPages}페이지)` : "";
    return {
        title: `구독자 대비 조회수가 급상승한 유튜브 채널 ${total.toLocaleString()}개${suffix}`,
        description:
            `구독자 수 대비 조회수가 폭발적으로 늘고 있는 유튜브 채널 ${total.toLocaleString()}개를 ` +
            `일평균 조회수 순으로 정리했습니다. 채널별 구독자·누적 조회수·성장 추이를 확인하세요.`,
        alternates: {
            canonical: page > 1 ? `/channel?page=${page}` : "/channel",
        },
    };
}

export default async function ChannelIndexPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const page = parsePage((await searchParams).page);
    const { items, total, totalPages } = await getChannelListPage(page);

    // 범위 밖 페이지(?page=999 등)가 200 으로 같은 내용을 반환하면 중복 URL 이
    // 무한히 생겨 크롤 예산을 낭비하므로 404 로 처리한다.
    if (page > totalPages) {
        notFound();
    }

    const startRank = (page - 1) * CHANNEL_LIST_PAGE_SIZE;

    // 추적 시작 단계 채널은 일평균이 산출되지 않아 순위 목록에서 빠지지만,
    // 상세 페이지와 sitemap 에는 남아 있다. 사이트 안에 갈 경로가 없으면 크롤러가
    // 발견하지 못하므로 1페이지 하단에 별도 구역으로 노출한다.
    // (모든 페이지에 넣으면 같은 링크가 12번 중복되므로 1페이지에만 둔다.)
    const newlyTracked = page === 1 ? await getNewlyTrackedChannels() : [];

    // 목록 자체를 구조화 데이터로 제공 — 크롤러가 항목과 링크를 함께 인식한다.
    const itemListLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "구독자 대비 조회수 급상승 채널",
        url: `${SITE.url}/channel${page > 1 ? `?page=${page}` : ""}`,
        numberOfItems: items.length,
        itemListElement: items.map((c, i) => ({
            "@type": "ListItem",
            position: startRank + i + 1,
            name: c.channel_title,
            url: `${SITE.url}/channel/${c.channel_id}`,
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
                        구독자 대비 조회수 급상승 채널
                    </h1>
                    <p className="mb-3 text-[13px] leading-relaxed text-neutral-500">
                        구독자 수 대비 조회수가 폭발적으로 늘고 있는 채널{" "}
                        <strong className="font-semibold text-neutral-700">
                            {total.toLocaleString()}개
                        </strong>
                        를 일평균 조회수 순으로 정렬했습니다. 채널 데이터는 매일 17시 이후 갱신됩니다.
                    </p>
                    {/* 이 목록이 무엇이고 무엇이 아닌지 명시한다.
                        '순위'로 오해하면 한국 유튜브 전체 TOP 으로 읽히는데, 실제로는
                        구독자 대비 성과가 높은 채널을 골라낸 집합이라 대형 채널이 빠져 있다. */}
                    <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[12px] leading-relaxed text-neutral-500">
                        이 목록은 <strong className="text-neutral-700">구독자 수 대비 조회 성과가 높은 채널</strong>을
                        선별해 추적한 결과입니다. 구독자가 매우 많은 대형 채널은 선별 기준상 포함되지 않으므로,
                        한국 유튜브 전체 구독자 순위와는 다릅니다.
                        수록 기준은 구독자 {fmtKr(CHANNEL_PAGE_MIN_SUBSCRIBERS, "명")} 이상입니다.
                    </p>
                </header>

                {/* 목록 */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-left text-[13px]">
                            <thead>
                                <tr className="border-b border-neutral-100 text-[11px] text-neutral-400">
                                    <th scope="col" className="px-4 py-2.5 font-medium">순위</th>
                                    <th scope="col" className="px-4 py-2.5 font-medium">채널</th>
                                    <th scope="col" className="px-4 py-2.5 font-medium">카테고리</th>
                                    <th scope="col" className="px-4 py-2.5 text-right font-medium">일평균 조회수</th>
                                    <th scope="col" className="px-4 py-2.5 text-right font-medium">구독자</th>
                                    <th scope="col" className="px-4 py-2.5 text-right font-medium">누적 조회수</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((c, i) => (
                                    <tr
                                        key={c.channel_id}
                                        className="border-b border-neutral-50 transition-colors last:border-0 hover:bg-neutral-50/60"
                                    >
                                        <td className="px-4 py-2.5 tabular-nums text-neutral-400">
                                            {startRank + i + 1}
                                        </td>
                                        <th scope="row" className="px-4 py-2.5 font-medium">
                                            <Link
                                                href={`/channel/${c.channel_id}`}
                                                className="text-[#1A1A1A] underline-offset-2 hover:underline"
                                            >
                                                {c.channel_title}
                                            </Link>
                                        </th>
                                        <td className="px-4 py-2.5 text-[12px] text-neutral-500">
                                            {c.main_category}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-[#1A1A1A]">
                                            {fmtKr(c.avg_daily_view_increase, "회")}
                                        </td>
                                        <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">
                                            {fmtKr(c.subscriber_count, "명")}
                                        </td>
                                        <td className="px-4 py-2.5 text-right tabular-nums text-neutral-500">
                                            {fmtKr(c.total_view_count, "회")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 페이지 이동 — 크롤러가 전체 목록을 따라갈 수 있도록 링크로 제공 */}
                {totalPages > 1 && (
                    <nav
                        aria-label="채널 목록 페이지"
                        className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
                    >
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <Link
                                key={p}
                                href={p === 1 ? "/channel" : `/channel?page=${p}`}
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

                {/* 추적 시작 단계 — 순위와 섞지 않고 별도 구역으로 */}
                {newlyTracked.length > 0 && (
                    <section className="mt-16 border-t border-neutral-100 pt-10">
                        <h2 className="mb-2 text-[15px] font-bold text-[#1A1A1A]">
                            추적 시작 단계 채널 {newlyTracked.length.toLocaleString()}개
                        </h2>
                        <p className="mb-5 text-[12px] leading-relaxed text-neutral-500">
                            추적을 막 시작해 비교할 이전 측정값이 없는 채널입니다. 일평균 증가량을
                            아직 산출할 수 없어 위 순위에는 포함하지 않았습니다. 하루가 지나 두 번째
                            측정이 쌓이면 자동으로 순위에 반영됩니다.
                        </p>
                        <ul className="flex flex-wrap gap-2">
                            {newlyTracked.map((c) => (
                                <li key={c.channel_id}>
                                    <Link
                                        href={`/channel/${c.channel_id}`}
                                        className="inline-flex items-baseline gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12px] text-neutral-700 transition-colors hover:bg-neutral-50"
                                    >
                                        <span className="font-medium">{c.channel_title}</span>
                                        <span className="text-[11px] text-neutral-400">
                                            {fmtKr(c.subscriber_count, "명")}
                                        </span>
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
