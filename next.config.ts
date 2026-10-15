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
 *   채널·인사이트 1시간 (매일 저녁 갱신) / 랭킹·구독자 구간 5분 (매시 25분경 갱신)
 * stale-while-revalidate 동안은 옛 보관본을 즉시 주고 뒤에서 새로 그린다.
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
      cdnCache("/channel/:id", 3600, 86400),
      cdnCache("/channel", 3600, 86400),
      cdnCache("/insights", 3600, 86400),
      cdnCache("/insights/:slug", 3600, 86400),
      cdnCache("/dashboard", 300, 600),
      cdnCache("/dashboard/benchmarking", 300, 3600),
      cdnCache("/tier", 300, 600),
      cdnCache("/tier/:level", 300, 600),
    ];
  },
};

export default nextConfig;
