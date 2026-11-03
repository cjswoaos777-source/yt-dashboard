import type { NextConfig } from "next";

/**
 * [2026-10-16] 페이지 HTML 을 Vercel CDN 에 잠시 보관한다.
 *
 * 모든 페이지가 force-dynamic 이라 응답이 'private, no-store' 로 나가 CDN 에 한 번도
 * 남지 않았다(x-vercel-cache: MISS). 그래서 구글봇(미국)이 올 때마다 뭄바이(bom1)
 * 함수가 새로 그렸고, Search Console 평균 응답이 1.7초였다. 구글은 느린 사이트를
 * 덜 크롤링하는데, 10월 초부터 하루 크롤링이 60~110회에서 10회 안팎으로 줄었다.
 *
 * Vercel-CDN-Cache-Control 은 Vercel CDN 만 읽고 브라우저에는 전달되지 않는다.
 * 브라우저는 여전히 매번 새로 받고, CDN 만 보관본을 쓴다.
 *
 * 'rsc' 헤더가 있는 요청(사이트 안에서 페이지를 옮길 때의 RSC 데이터 요청)은 제외한다.
 * 그 응답은 HTML 이 아니라서 섞이면 안 된다(그 요청은 ?_rsc= 로 주소도 다르다).
 *
 * 보관 시간은 데이터가 바뀌는 주기에 맞췄다.
 *   채널·인사이트·카테고리 1시간 (매일 저녁 갱신) / 랭킹·구독자 구간 5분 (매시 25분경 갱신)
 * stale-while-revalidate 동안은 옛 보관본을 즉시 주고 뒤에서 새로 그린다.
 *
 * [2026-11-03] Vercel Hobby 의 Active CPU 는 30일에 4시간까지다. 10-29 부터 하루 9~15분을 써서(10-04~11-03 합계 2h55m)
 * 일주일 안에 넘을 판이었다. 12시간 관측: 채널 성과 카드 이미지 315회 2분(가장 큼), 채널 상세 2,500회 1분(대부분 검색 로봇),
 * /ideas 613회(보관 없이 매번 그림). 그래서 보관 시간을 늘린다.
 *   채널 성과 카드 7일(카드 숫자는 하루 한 번 바뀌지만 공유 미리보기에는 충분) / 채널 상세 6시간 /
 *   /ideas 30분(매시 갱신) / 태그 목록·상세 1시간
 */
function cdnCache(source: string, seconds: number, staleSeconds: number) {
    return {
        source,
        missing: [{ type: "header" as const, key: "rsc" }],
        headers: [
            {
                key: "Vercel-CDN-Cache-Control",
                value: `public, s-maxage=${seconds}, stale-while-revalidate=${staleSeconds}`,
            },
        ],
    };
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async headers() {
    return [
      cdnCache("/channel/:id", 21600, 86400),
      // 채널 성과 카드 이미지 (opengraph-image.tsx). 그리는 데 글꼴 받기까지 수백 ms 라 꼭 보관한다(11-03: 1시간 → 7일).
      cdnCache("/channel/:id/opengraph-image", 604800, 604800),
      cdnCache("/channel", 3600, 86400),
      cdnCache("/insights", 3600, 86400),
      cdnCache("/insights/:slug", 3600, 86400),
      cdnCache("/dashboard", 300, 600),
      cdnCache("/dashboard/benchmarking", 300, 3600),
      cdnCache("/tier", 300, 600),
      cdnCache("/tier/:level", 300, 600),
      // 카테고리 순위는 채널 지표로 만든다 (매일 저녁 갱신)
      cdnCache("/category", 3600, 86400),
      cdnCache("/category/:slug", 3600, 86400),
      // 11-03: 보관 없이 매번 그리던 곳 (지금 만들 만한 영상은 매시 갱신, 태그는 매시 적재)
      cdnCache("/ideas", 1800, 3600),
      cdnCache("/tag", 3600, 86400),
      cdnCache("/tag/:slug", 3600, 86400),
    ];
  },
};

export default nextConfig;
