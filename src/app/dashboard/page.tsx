import { unstable_cache } from "next/cache";
import { ViralVideo } from "@/lib/viral-types";
import { DashboardClient } from "./DashboardClient";
import { RANKING_TIER_URLS } from "@/lib/cdn";
import { getLatestNotice } from "@/lib/notices";
import { SITE } from "@/lib/site";
import type { Metadata } from "next";

// DashboardClient가 useSearchParams를 쓰므로 정적 프리렌더 시 CSR bailout이 발생해
// 랭킹 데이터가 HTML에서 빠진다. 크롤러에게 콘텐츠를 보여주려면 SSR을 유지해야 한다.
export const dynamic = "force-dynamic";
const DISPLAY_LIMIT = 50;

export const metadata: Metadata = {
  title: "실시간 떡상 영상 TOP 50",
  description:
    "지금 이 순간 조회수가 폭발적으로 오르고 있는 유튜브 영상 TOP 50. 숏츠/롱폼, 국내/해외, 구독자 구간별 필터로 진짜 떡상 영상을 찾아보세요.",
  alternates: { canonical: "/dashboard" },
  openGraph: {
    title: "실시간 떡상 영상 TOP 50 | Viral Hunter",
    description:
      "지금 이 순간 조회수가 폭발적으로 오르고 있는 유튜브 영상 TOP 50. 매시간 자동 갱신됩니다.",
    url: `${SITE.url}/dashboard`,
    type: "website",
  },
};

// 원본 gz는 1.7MB로 Next 데이터 캐시 한도(2MB, base64 인코딩 후 초과)에 걸리므로
// 응답 자체는 캐싱하지 않고, 가공 결과(TOP 50 + 카테고리)만 캐싱한다.
// TTL은 5분: 파이프라인은 매시간 갱신하지만 갱신 시각과 캐시 만료 시각이 어긋나면
// 새 데이터가 최대 TTL만큼 늦게 노출되므로, "실시간" 노출을 위해 짧게 유지한다.
const getRankingSnapshot = unstable_cache(
  async (): Promise<{
    videos: ViralVideo[];
    categories: string[];
    updatedAt: string;
  }> => {
    const res = await fetch(RANKING_TIER_URLS.all, { cache: "no-store" });
    if (!res.ok) throw new Error(`CDN fetch failed: ${res.status} ${res.statusText}`);

    // jsDelivr가 Content-Encoding:gzip 자동 적용 → 이미 decode된 경우 .json() 직접 사용
    // Content-Type이 application/gzip인 경우 수동 디코딩
    let allVideos: ViralVideo[];
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("gzip") || contentType.includes("octet-stream")) {
      const { promisify } = await import("util");
      const { gunzip } = await import("zlib");
      const gunzipAsync = promisify(gunzip);
      const buf = Buffer.from(await res.arrayBuffer());
      const decompressed = await gunzipAsync(buf);
      allVideos = JSON.parse(decompressed.toString("utf-8"));
    } else {
      allVideos = await res.json();
    }

    const videos = [...allVideos]
      .sort((a, b) => (b.hourly_view_increase ?? 0) - (a.hourly_view_increase ?? 0))
      .slice(0, DISPLAY_LIMIT);

    const catSet = new Set<string>();
    for (const v of allVideos) {
      if (v.category_name) catSet.add(v.category_name);
    }

    let updatedAt = "";
    if (videos.length > 0 && videos[0].updated_at) {
      const raw = videos[0].updated_at;
      const dashMatch = raw.match(/(\d{4}-\d{2}-\d{2})-(\d{1,2})$/);
      const colonMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
      if (dashMatch) updatedAt = `${parseInt(dashMatch[2], 10)}시`;
      else if (colonMatch) updatedAt = `${parseInt(colonMatch[1], 10)}시`;
      else updatedAt = raw;
    }

    return { videos, categories: Array.from(catSet).sort(), updatedAt };
  },
  // 키 끝의 -v2: Vercel Data Cache 는 배포 간에도 유지되므로, jsDelivr 를 쓰던
  // 시절 저장된 항목이 그대로 서빙됐다(4시간 이상 지난 데이터가 노출됨).
  // 출처를 바꿀 때는 키도 함께 바꿔야 옛 항목이 무효화된다.
  ["dashboard-ranking-all-v2"],
  { revalidate: 300 }
);

export default async function DashboardPage() {
  let initialVideos: ViralVideo[] = [];
  let categories: string[] = [];
  let updatedAt = "";

  try {
    const snapshot = await getRankingSnapshot();
    initialVideos = snapshot.videos;
    categories = snapshot.categories;
    updatedAt = snapshot.updatedAt;
  } catch {
    // SSR 실패시 빈 상태로 렌더 → 클라이언트가 마운트 후 재요청
  }

  const latestNotice = getLatestNotice();

  // 랭킹 상위 10개 ItemList 구조화 데이터
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "실시간 떡상 영상 TOP 50",
    url: `${SITE.url}/dashboard`,
    numberOfItems: initialVideos.length,
    itemListElement: initialVideos.slice(0, 10).map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: v.title,
      url: `https://www.youtube.com/watch?v=${v.video_id}`,
    })),
  };

  return (
    <>
      {initialVideos.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <DashboardClient
        initialVideos={initialVideos}
        allVideos={[]}
        categories={categories}
        updatedAt={updatedAt}
        latestNotice={latestNotice}
      />
    </>
  );
}
