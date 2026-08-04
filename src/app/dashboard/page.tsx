import { unstable_cache } from "next/cache";
import { ViralVideo } from "@/lib/viral-types";
import { DashboardClient } from "./DashboardClient";
import { RANKING_TIER_URLS, getCdnVersion } from "@/lib/cdn";
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
    "지금 이 순간 조회수가 폭발적으로 오르고 있는 국내 유튜브 영상 TOP 50. 숏츠/롱폼, 구독자 구간별 필터로 진짜 떡상 영상을 찾아보세요. 해외 트렌드도 함께 볼 수 있습니다.",
  alternates: { canonical: "/dashboard" },
  openGraph: {
    title: "실시간 떡상 영상 TOP 50 | Viral Hunter",
    description:
      "지금 이 순간 조회수가 폭발적으로 오르고 있는 국내 유튜브 영상 TOP 50. 매시간 자동 갱신됩니다.",
    url: `${SITE.url}/dashboard`,
    type: "website",
  },
};

// 원본 gz는 1.7MB로 Next 데이터 캐시 한도(2MB, base64 인코딩 후 초과)에 걸리므로
// 응답 자체는 캐싱하지 않고, 가공 결과(TOP 50 + 카테고리)만 캐싱한다.
//
// 캐시 키에 version(ETag)을 넣어, 원본이 실제로 바뀔 때만 다시 계산한다.
// 시간 기준 TTL 로 잡으면 데이터가 그대로인데도 주기마다 1.7MB를 다시 받아
// 정렬하면서, 동시에 그 주기만큼 반영이 늦어진다. 버전 기준이면 둘 다 없다.
// revalidate 는 안 쓰는 항목을 정리하기 위한 상한일 뿐이다.
const getRankingSnapshot = (version: string) => unstable_cache(
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

    // 기본 화면은 국내 영상만 보여준다. 클라이언트 기본 필터와 반드시 같아야
    // SSR HTML 과 첫 렌더가 어긋나지 않는다(다르면 목록이 비어 보인다).
    //
    // 전체 기준으로 세우면 상위가 해외로만 채워진다. 2026-08-04 실측으로
    // 15,710건 중 해외가 72.5%였고 TOP 50 이 50개 모두 해외였다.
    // "한국 유튜브 트렌드"를 표방하는 화면의 첫인상으로는 맞지 않다.
    const domestic = allVideos.filter((v) => v.origin_type === "DOMESTIC");

    const videos = [...domestic]
      .sort((a, b) => (b.hourly_view_increase ?? 0) - (a.hourly_view_increase ?? 0))
      .slice(0, DISPLAY_LIMIT);

    // 카테고리 목록은 전체 기준으로 뽑는다. 사용자가 해외/전체로 전환했을 때
    // 선택지가 사라지면 안 되기 때문이다.
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
  // -v3 + version: Vercel Data Cache 는 배포 간에도 유지되므로, 가공 로직이나
  // 데이터 출처를 바꿀 때는 접미사도 올려야 옛 결과가 계속 서빙되지 않는다.
  // version(ETag)이 키에 있으므로 원본이 바뀌면 자동으로 새 항목이 만들어진다.
  // -v4: 기본 화면을 국내 우선으로 바꾸면서 가공 결과가 달라져 옛 항목을 무효화한다.
  ["dashboard-ranking-all-v4", version],
  { revalidate: 3600 }
)();

export default async function DashboardPage() {
  let initialVideos: ViralVideo[] = [];
  let categories: string[] = [];
  let updatedAt = "";

  try {
    const version = await getCdnVersion(RANKING_TIER_URLS.all);
    const snapshot = await getRankingSnapshot(version);
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
    name: "실시간 국내 떡상 영상 TOP 50",
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
