import { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    // /dashboard/sample은 disallow 대신 페이지 메타데이터의 noindex로 색인 제외
    // (disallow하면 크롤러가 noindex 태그 자체를 읽지 못함)
    //
    // [2026-09-09] 채널·태그 '상세' 페이지를 크롤에서 제외한다.
    //
    // 왜: 이 페이지들은 데이터가 매일 크게 회전해(채널 ~17%/일, 태그 ~45%/일)
    //     이미 noindex 이고 사이트맵에도 없다. 즉 크롤해도 색인되는 게 없다.
    //     그런데 크롤 비용은 매우 비싸다 — 상세 1건을 그리려고 1.3MB gzip 을
    //     풀고 객체 8,000개를 파싱한다. 캐시 키에 id/slug 가 들어가 있어
    //     페이지마다 그 작업을 따로 한다.
    //
    //     09-01 도메인 이전 후 구글이 새 사이트로 보고 전체를 다시 훑으면서
    //     Vercel Fluid Active CPU 가 월 한도(4시간)에 근접했다.
    //     얻는 것 없이 비용만 드는 경로라 차단한다.
    //
    // 손실이 없는 이유: noindex 라 색인된 게 없고, 사이트맵에도 없다.
    //     사람 방문자는 robots.txt 의 영향을 받지 않으므로 그대로 볼 수 있다.
    //
    // 허브(/channel, /tag)는 열어둔다 — 안정적인 URL 이고 사이트맵에도 있다.
    //
    // 되돌리려면 아래 disallow 배열을 비우면 된다. Supabase 전환(5단계)으로
    // 상세 1건이 '1행 조회'가 되면 비용 구조가 달라지므로 그때 재검토할 것.
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/channel/UC',   // 채널 상세. 허브 '/channel' 은 걸리지 않는다
        '/tag/',         // 태그 상세. 허브 '/tag' 는 걸리지 않는다
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
