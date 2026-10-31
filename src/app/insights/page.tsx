import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getInsights, insightSummary, INSIGHT_REPORTS } from "@/lib/insights";
import { SITE } from "@/lib/site";
import { MetricsDisclosure } from "@/components/legal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "유튜브 데이터 인사이트",
    description:
        "수집한 국내 유튜브 영상 수십만 건을 집계해 업로드 시간대, 숏츠와 롱폼의 차이, 채널 나이와 성과의 관계를 살펴봅니다. 감이 아니라 실제 데이터로 확인하세요.",
    alternates: { canonical: "/insights" },
    openGraph: {
        title: "유튜브 데이터 인사이트 | Viral Hunter",
        description: "수집한 국내 유튜브 영상 수십만 건을 집계한 리포트.",
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
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
            />
            {/* [2026-10-30] 새 디자인: 모양만 바꿨다. 글·링크는 그대로다. */}
            <main className="vh-main vh-article">
                <Link href="/dashboard" className="vh-back">
                    <ArrowLeft aria-hidden="true" />
                    대시보드로
                </Link>

                <header className="vh-phead">
                    <h1>유튜브 데이터 인사이트</h1>
                    <p className="vh-lead">
                        &ldquo;몇 시에 올려야 한다&rdquo;, &ldquo;숏츠가 유리하다&rdquo; 같은 이야기를
                        실제 수집 데이터로 확인해봤습니다.
                        {data && (
                            <>
                                {" "}
                                이 서비스가 수집한 국내 영상{" "}
                                <strong>{data.sample_size.toLocaleString()}건</strong>
                                (최근 {data.window_days}일) 기준입니다.
                            </>
                        )}
                    </p>
                    {/* YouTube API 정책 III.E.4.h: 자체 계산 지표 고지 */}
                    <MetricsDisclosure />
                </header>

                <ul className="vh-replist">
                    {INSIGHT_REPORTS.map((r) => (
                        <li key={r.slug}>
                            <Link href={`/insights/${r.slug}`}>
                                <h2 className="vh-replist-t">{r.title}</h2>
                                <p>{insightSummary(r.slug, data)}</p>
                            </Link>
                        </li>
                    ))}
                </ul>

                {data && (
                    <p className="vh-note">
                        ※ 한국 유튜브 전체가 아닙니다. 매일 카테고리별로 조회수 상위 영상을
                        수집한 범위(채널 약 4만 개) 안의 표본이라, 이미 어느 정도 성과가 난
                        영상들의 비교로 읽어야 합니다. 각 리포트 상단에 수집 방식과 한계를
                        적어두었습니다. 데이터는 매일 1회 갱신됩니다.
                    </p>
                )}
            </main>
        </>
    );
}
