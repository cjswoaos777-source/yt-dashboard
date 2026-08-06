import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getInsights, INSIGHT_REPORTS } from "@/lib/insights";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "유튜브 데이터 인사이트",
    description:
        "국내 유튜브 영상 수십만 건을 집계해 업로드 시간대, 숏츠와 롱폼의 차이, 채널 나이와 성과의 관계를 살펴봅니다. 감이 아니라 실제 데이터로 확인하세요.",
    alternates: { canonical: "/insights" },
    openGraph: {
        title: "유튜브 데이터 인사이트 | Viral Hunter",
        description: "국내 유튜브 영상 수십만 건을 집계한 리포트.",
        url: `${SITE.url}/insights`,
        type: "website",
    },
};

export default async function InsightsIndexPage() {
    const data = await getInsights();

    const itemListLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "유튜브 데이터 인사이트",
        url: `${SITE.url}/insights`,
        numberOfItems: INSIGHT_REPORTS.length,
        itemListElement: INSIGHT_REPORTS.map((r, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: r.title,
            url: `${SITE.url}/insights/${r.slug}`,
        })),
    };

    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
            />
            <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
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
                        유튜브 데이터 인사이트
                    </h1>
                    <p className="text-[13px] leading-relaxed text-neutral-500">
                        &ldquo;몇 시에 올려야 한다&rdquo;, &ldquo;숏츠가 유리하다&rdquo; 같은 이야기를
                        실제 수집 데이터로 확인해봤습니다.
                        {data && (
                            <>
                                {" "}
                                국내 영상{" "}
                                <strong className="font-semibold text-neutral-700">
                                    {data.sample_size.toLocaleString()}건
                                </strong>
                                (최근 {data.window_days}일) 기준입니다.
                            </>
                        )}
                    </p>
                </header>

                <ul className="space-y-3">
                    {INSIGHT_REPORTS.map((r) => (
                        <li key={r.slug}>
                            <Link
                                href={`/insights/${r.slug}`}
                                className="block rounded-2xl border border-neutral-200 bg-white p-5 transition-colors hover:bg-neutral-50/60"
                            >
                                <h2 className="mb-1.5 text-[15px] font-bold text-[#1A1A1A]">
                                    {r.title}
                                </h2>
                                <p className="text-[13px] leading-relaxed text-[#555555]">
                                    {r.summary}
                                </p>
                            </Link>
                        </li>
                    ))}
                </ul>

                {data && (
                    <p className="mt-8 text-[12px] leading-relaxed text-neutral-400">
                        ※ 조회수 {data.min_views.toLocaleString()}회 이상인 국내 영상만 집계했습니다.
                        노출이 거의 없던 영상까지 넣으면 중위값이 왜곡되기 때문입니다.
                        데이터는 매일 갱신됩니다.
                    </p>
                )}
            </main>
        </div>
    );
}
