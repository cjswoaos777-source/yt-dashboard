import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAllNotices, getNoticeBySlug, getCategoryColor } from "@/lib/notices";
import { SITE } from "@/lib/site";

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
    if (!notice) return { title: "공지사항" };
    const description = notice.excerpt || notice.title;
    return {
        title: notice.title,
        description,
        alternates: { canonical: `/notice/${slug}` },
        openGraph: {
            title: `${notice.title} | Viral Hunter`,
            description,
            url: `/notice/${slug}`,
            type: "article",
            publishedTime: notice.date,
        },
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

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: notice.title,
        datePublished: notice.date,
        dateModified: notice.date,
        author: { "@type": "Organization", name: SITE.name },
        publisher: { "@type": "Organization", name: SITE.name },
        mainEntityOfPage: `${SITE.url}/notice/${slug}`,
    };

    const breadcrumbLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "공지사항", item: `${SITE.url}/notice` },
            { "@type": "ListItem", position: 2, name: notice.title, item: `${SITE.url}/notice/${slug}` },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
            />
            {/* [2026-10-30] 새 디자인: 모양만 바꿨다. 글·링크는 그대로다. */}
            <main className="vh-main vh-article">

                {/* Back */}
                <Link href="/notice" className="vh-back">
                    <ArrowLeft aria-hidden="true" />
                    공지 목록으로
                </Link>

                {/* Article */}
                <article className="vh-art">
                    {/* Meta */}
                    <div className="vh-art-meta">
                        <span className={`vh-notice-cat ${color.bg} ${color.text} ${color.border}`}>
                            {notice.category}
                        </span>
                        <span>
                            {notice.date}
                        </span>
                    </div>

                    {/* Title */}
                    <h1>{notice.title}</h1>

                    {/* Body (rendered HTML) */}
                    <div
                        className="prose-notice vh-md"
                        dangerouslySetInnerHTML={{ __html: notice.contentHtml }}
                    />
                </article>

                {/* Bottom Back CTA */}
                <div className="vh-center">
                    <Link href="/notice" className="vh-cta">
                        <ArrowLeft aria-hidden="true" />
                        목록으로 돌아가기
                    </Link>
                </div>

            </main>
        </>
    );
}
