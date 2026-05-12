import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAllNotices, getNoticeBySlug, getCategoryColor } from "@/lib/notices";

export async function generateStaticParams() {
    return getAllNotices().map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const notice = await getNoticeBySlug(slug);
    if (!notice) return { title: "공지사항 - Viral Hunter" };
    return {
        title: `${notice.title} - 공지사항 - Viral Hunter`,
        description: notice.title,
    };
}

export default async function NoticeDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const notice = await getNoticeBySlug(slug);

    if (!notice) {
        notFound();
    }

    const color = getCategoryColor(notice.category);

    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">

                {/* Back */}
                <Link
                    href="/notice"
                    className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    공지 목록으로
                </Link>

                {/* Article */}
                <article>
                    {/* Meta */}
                    <div className="mb-5 flex flex-wrap items-center gap-3">
                        <span
                            className={`inline-flex items-center rounded-full border ${color.bg} ${color.text} ${color.border} px-2.5 py-0.5 text-[11px] font-semibold`}
                        >
                            {notice.category}
                        </span>
                        <span className="text-[12px] font-medium text-neutral-400">
                            {notice.date}
                        </span>
                    </div>

                    {/* Title */}
                    <h1
                        className="mb-10 font-serif text-3xl font-bold leading-tight tracking-tight text-[#1A1A1A] md:text-4xl"
                        style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                        {notice.title}
                    </h1>

                    {/* Body (rendered HTML) */}
                    <div
                        className="prose-notice text-[15px] leading-relaxed text-[#333333]"
                        dangerouslySetInnerHTML={{ __html: notice.contentHtml }}
                    />
                </article>

                {/* Bottom Back CTA */}
                <div className="mt-16 flex justify-center border-t border-neutral-100 pt-8">
                    <Link
                        href="/notice"
                        className="inline-flex items-center gap-1.5 rounded-full bg-black px-5 py-2 text-[13px] font-medium text-white transition-all hover:scale-[0.97]"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        목록으로 돌아가기
                    </Link>
                </div>

            </main>
        </div>
    );
}
