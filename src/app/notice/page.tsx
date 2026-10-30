import Link from "next/link";
import { getAllNotices, getCategoryColor } from "@/lib/notices";

export const metadata = {
    title: "공지사항",
    description: "Viral Hunter 운영 공지와 업데이트 소식. 유튜브 급상승 랭킹, 채널 분석, 주간 트렌드 리포트에 새로 생긴 기능과 데이터 기준 변경, 장애 안내를 확인하세요.",
    alternates: { canonical: "/notice" },
    openGraph: {
        title: "공지사항 | Viral Hunter",
        description: "Viral Hunter 운영 공지와 업데이트 소식. 유튜브 급상승 랭킹, 채널 분석, 주간 트렌드 리포트에 새로 생긴 기능과 데이터 기준 변경, 장애 안내를 확인하세요.",
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
        /* [2026-10-30] 새 디자인: 모양만 바꿨다. 글·링크는 그대로다. */
        <main className="vh-main vh-article">

                {/* Header */}
                <header className="vh-phead">
                    <p className="vh-eyebrow">Notice · 공지사항</p>
                    <h1>📢 공지사항</h1>
                    <p className="vh-lead">
                        운영 공지, 업데이트 소식, 장애 안내를 모아두었습니다.
                    </p>
                </header>

                {/* List */}
                {visible.length === 0 ? (
                    <div className="vh-card vh-empty">
                        아직 등록된 공지사항이 없습니다.
                    </div>
                ) : (
                    <ul className="vh-noticelist">
                        {visible.map((notice) => {
                            const color = getCategoryColor(notice.category);
                            return (
                                <li key={notice.slug}>
                                    <Link href={`/notice/${notice.slug}`}>
                                        <span
                                            className={`vh-notice-cat ${color.bg} ${color.text} ${color.border}`}
                                        >
                                            {notice.category}
                                        </span>
                                        <span className="vh-noticelist-t">{notice.title}</span>
                                        <span className="vh-noticelist-d">
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
                    <nav className="vh-pager">
                        {safePage > 1 && (
                            <Link href={`/notice?page=${safePage - 1}`}>
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
                                    aria-current={isActive ? "page" : undefined}
                                >
                                    {n}
                                </Link>
                            );
                        })}
                        {safePage < totalPages && (
                            <Link href={`/notice?page=${safePage + 1}`}>
                                다음 →
                            </Link>
                        )}
                    </nav>
                )}

        </main>
    );
}
