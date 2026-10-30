import { unstable_cache } from "next/cache";
import Link from "next/link";
import { ViralVideo } from "@/lib/viral-types";
import { DashboardClient } from "./DashboardClient";
import { RANKING_TIER_URLS, getCdnVersion } from "@/lib/cdn";
import { isSupabase } from "@/lib/datasource";
import { fetchRanking, fetchCategories, fetchRankingVersion } from "@/lib/supabase";
import { getLatestNotice } from "@/lib/notices";
import { SITE } from "@/lib/site";
import type { Metadata } from "next";

// DashboardClient가 useSearchParams를 쓰므로 정적 프리렌더 시 CSR bailout이 발생해
// 랭킹 데이터가 HTML에서 빠진다. 크롤러에게 콘텐츠를 보여주려면 SSR을 유지해야 한다.
export const dynamic = "force-dynamic";
const DISPLAY_LIMIT = 50;

// [2026-10-16] 'TOP 50'은 50개만 보이던 시절 이름이다. 지금은 조합별 최대 1,000위.
// 제목 앞쪽에 사람들이 실제로 검색하는 표현('유튜브 실시간 급상승 동영상 순위')을 두고,
// 설명에는 쇼츠·카테고리·국내/해외 같은 세부 검색어를 자연스럽게 담는다.
export const metadata: Metadata = {
  title: "유튜브 실시간 급상승 동영상 순위 TOP 1000",
  description:
    "지금 조회수가 가장 빠르게 오르는 유튜브 급상승 동영상 순위. 시간당 조회수 증가로 매긴 국내·해외 인기 영상을 쇼츠·롱폼, 카테고리, 구독자 구간별로 최대 1,000위까지 확인하세요. 매시간 갱신됩니다.",
  alternates: { canonical: "/dashboard" },
  openGraph: {
    title: "유튜브 실시간 급상승 동영상 순위 TOP 1000 | Viral Hunter",
    description:
      "지금 조회수가 가장 빠르게 오르는 유튜브 동영상 순위. 쇼츠·롱폼, 카테고리별로 최대 1,000위까지, 매시간 갱신됩니다.",
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

/** '2026-09-09-15' 또는 '15:00' → '15시' */
function toHourLabel(raw: string): string {
  const dashMatch = raw.match(/(\d{4}-\d{2}-\d{2})-(\d{1,2})$/);
  if (dashMatch) return `${parseInt(dashMatch[2], 10)}시`;
  const colonMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) return `${parseInt(colonMatch[1], 10)}시`;
  return raw;
}

/**
 * Supabase 판 초기 스냅샷.
 *
 * GitHub 경로는 1.5MB gzip 을 받아 풀고 14,000개를 파싱한 뒤 50개만 쓴다.
 * 여기서는 필요한 50행만 받는다. 클라이언트가 마운트 후 Supabase 로 다시
 * 받으므로, 이 경로가 없으면 서버는 GitHub, 클라이언트는 Supabase 를 읽어
 * 같은 화면에 두 출처의 비용을 다 내게 된다.
 *
 * 국내로 좁히는 것은 클라이언트 기본 필터와 맞추기 위해서다. 어긋나면
 * SSR HTML 과 첫 렌더가 달라져 목록이 잠깐 비어 보인다.
 */
const getSupabaseSnapshot = (version: string) => unstable_cache(
  async (): Promise<{
    videos: ViralVideo[];
    categories: string[];
    updatedAt: string;
  }> => {
    const [rows, categories] = await Promise.all([
      fetchRanking({ tier: "all", origin: "DOMESTIC", limit: DISPLAY_LIMIT }),
      fetchCategories(),
    ]);
    const videos = rows as unknown as ViralVideo[];
    const updatedAt = videos[0]?.updated_at ? toHourLabel(videos[0].updated_at) : "";
    return { videos, categories, updatedAt };
  },
  // [2026-09-18] 데이터 버전을 키에 넣는다. 30분 고정이면 매시 25분에 바뀌는
  // 데이터와 어긋나 "N시 집계" 라벨이 한 시간 넘게 옛 값으로 남았다.
  ["dashboard-ssr-supabase-v2", version],
  { revalidate: 3600 },
)();

export default async function DashboardPage() {
  let initialVideos: ViralVideo[] = [];
  let categories: string[] = [];
  let updatedAt = "";

  try {
    // 출처 스위치. github 로 되돌리면 아래 GitHub 경로가 그대로 살아난다.
    const snapshot = isSupabase
      ? await getSupabaseSnapshot((await fetchRankingVersion()).version)
      : await getRankingSnapshot(await getCdnVersion(RANKING_TIER_URLS.all));
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
    name: "유튜브 실시간 급상승 동영상 순위 (국내)",
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
      <RankingMethod />
    </>
  );
}

/**
 * 순위 산정 방식 (서버에서 그리는 고정 글).
 *
 * [2026-10-29] SEO 운영안: 순위 목록은 매시간 바뀌므로 페이지 글이 거의 목록뿐이었다.
 * 다음 검색은 '방문할 때마다 결과가 다르게 나오는 검색 결과형 문서'를 수집 제한 대상으로 꼽는다.
 * 바뀌지 않는 설명을 함께 두어 이 페이지가 무엇을 어떻게 재는지 밝힌다.
 * 숫자는 수집기 정의와 /about/metrics 의 설명에 맞춘다.
 */
function RankingMethod() {
  const items: { term: string; body: React.ReactNode }[] = [
    {
      term: "대상",
      body: <>매일 오후 5시에 15개 카테고리에서 한국 지역 검색 기준으로 찾은 업로드 2일 안 된 영상과, 매시간 최근 3시간 안에 올라온 영상을 같은 기준으로 더 찾은 영상입니다. 4분 미만 영상은 조회수 3만 회, 4분 이상은 1만 회를 넘은 것만 담고, <strong>올라온 지 7일이 될 때까지</strong> 순위에 둡니다. 한국 유튜브의 모든 영상이 아니라 이미 반응이 오기 시작한 영상의 표본입니다.</>,
    },
    {
      term: "줄 세우는 기준",
      body: <>담은 영상의 조회수·좋아요·댓글 수를 다시 받아 <strong>최근 1시간 동안 늘어난 양</strong>으로 줄을 세웁니다. 국내 영상은 매시간 재고, 해외 영상은 잘 오르는 12만 개만 매시간·나머지는 6시간마다 재서 1시간 평균으로 나눕니다. 기본은 조회수 증가이고, 좋아요 증가·댓글 증가·누적 조회수로도 정렬할 수 있습니다.</>,
    },
    {
      term: "갱신",
      body: <>매시간 25분 무렵 새 집계로 바뀝니다. 화면 위의 &apos;N시 집계&apos;가 지금 보고 있는 집계 시각입니다.</>,
    },
    {
      term: "필터",
      body: <>형식(숏츠·롱폼), 지역(국내·해외), 구독자 구간(100만 이상, 10만~100만, 1만~10만, 1만 미만), 카테고리로 나눠 볼 수 있습니다. 카테고리는 영상을 올린 사람이 직접 고른 유튜브 카테고리라 내용과 다를 수 있습니다.</>,
    },
    {
      term: "읽을 때 주의",
      body: <>광고로 집행된 브랜드 영상은 광고 조회수도 유튜브 조회수에 들어가 구독자에 비해 크게 나올 수 있습니다. 순위와 증가량은 YouTube API의 공개 데이터로 자체 계산한 값이며, YouTube가 제공하거나 보증하는 수치가 아닙니다.</>,
    },
  ];
  return (
    // [2026-10-30 새 디자인] 글은 그대로 두고 모양만 바꿨다 (SEO 점검: 서버에서 그리는 고정 글 유지).
    <div className="vh-main" style={{ paddingTop: 0 }}>
      <section className="vh-method" aria-labelledby="ranking-method">
        <h2 id="ranking-method">이 순위는 이렇게 매깁니다</h2>
        <dl>
          {items.map((it) => (
            <div key={it.term}>
              <dt>{it.term}</dt>
              <dd>{it.body}</dd>
            </div>
          ))}
        </dl>
        <p>
          계산 방법은 <Link href="/about/metrics">지표 설명</Link>, 지난주 흐름은 <Link href="/report">주간 트렌드 리포트</Link>,
          카테고리별로 뜨는 유튜버는 <Link href="/category">카테고리 순위</Link>에서 볼 수 있습니다. 이 순위로 &lsquo;지금 무엇을
          만들면 좋을지&rsquo; 고른 결과는 <Link href="/ideas">지금 만들 만한 영상</Link>에 매시간 정리합니다.
        </p>
      </section>
    </div>
  );
}
