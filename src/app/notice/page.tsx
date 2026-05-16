import Link from "next/link";
import { getAllNotices, getCategoryColor } from "@/lib/notices";

export const metadata = {
    title: "공지사항",
    description: "Viral Hunter 운영 공지, 업데이트 소식, 장애 안내를 확인하세요.",
    alternates: { canonical: "/notice" },
    openGraph: {
        title: "공지사항 | Viral Hunter",
        description: "Viral Hunter 운영 공지, 업데이트 소식, 장애 안내를 확인하세요.",
        url: "/notice",
        type: "website",
    },
};

const PER_PAGE = 10;

export default async function NoticeListPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

    const all = getAllNotices();
    const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PER_PAGE;
    const visible = all.slice(start, start + PER_PAGE);

    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-10">

                {/* Header */}
                <header className="mb-10">
                    <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-orange-400" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                            Notice · 공지사항
                        </span>
                    </div>
                    <h1
                        className="font-serif text-4xl font-bold leading-tight tracking-tight text-[#1A1A1A] md:text-5xl"
                        style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                        📢 공지사항
                    </h1>
                    <p className="mt-3 text-base text-[#555555]">
                        운영 공지, 업데이트 소식, 장애 안내를 모아두었습니다.
                    </p>
                </header>

                {/* List */}
                {visible.length === 0 ? (
                    <div className="flex h-64 items-center justify-center rounded-2xl border border-neutral-100 bg-neutral-50/50 text-sm text-neutral-400">
                        아직 등록된 공지사항이 없습니다.
                    </div>
                ) : (
                    <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-100 bg-white shadow-sm">
                        {visible.map((notice) => {
                            const color = getCategoryColor(notice.category);
                            return (
                                <li key={notice.slug}>
                                    <Link
                                        href={`/notice/${notice.slug}`}
                                        className="flex flex-col gap-2 px-6 py-5 transition-colors hover:bg-neutral-50/70 sm:flex-row sm:items-center sm:gap-4"
                                    >
                                        <span
                                            className={`inline-flex w-fit shrink-0 items-center rounded-full border ${color.bg} ${color.text} ${color.border} px-2.5 py-0.5 text-[11px] font-semibold`}
                                        >
                                            {notice.category}
                                        </span>
                                        <span className="flex-1 text-[15px] font-medium text-[#1A1A1A] line-clamp-1">
                                            {notice.title}
                                        </span>
                                        <span className="shrink-0 text-[12px] font-medium text-neutral-400">
                                            {notice.date}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <nav className="mt-8 flex items-center justify-center gap-1.5">
                        {safePage > 1 && (
                            <Link
                                href={`/notice?page=${safePage - 1}`}
                                className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
                            >
                                ← 이전
                            </Link>
                        )}
                        {Array.from({ length: totalPages }).map((_, i) => {
                            const n = i + 1;
                            const isActive = n === safePage;
                            return (
                                <Link
                                    key={n}
                                    href={`/notice?page=${n}`}
                                    className={
                                        isActive
                                            ? "rounded-full bg-black px-3.5 py-1.5 text-[13px] font-semibold text-white"
                                            : "rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
                                    }
                                >
                                    {n}
                                </Link>
                            );
                        })}
                        {safePage < totalPages && (
                            <Link
                                href={`/notice?page=${safePage + 1}`}
                                className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
                            >
                                다음 →
                            </Link>
                        )}
                    </nav>
                )}

            </main>
        </div>
    );
}
