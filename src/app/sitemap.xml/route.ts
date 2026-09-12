import { renderSitemapIndex, xmlResponse } from "@/lib/sitemap-parts";
import { SITE } from "@/lib/site";

/**
 * 사이트맵 인덱스.
 *
 * [2026-09-12] 단일 urlset 에서 인덱스로 되돌렸다. 채널 상세를 다시 싣기
 * 때문이다 — 정적 19개와 채널 수천 개를 한 파일에 섞는 것보다 조각으로
 * 나누면 서치콘솔에서 어느 쪽이 색인되는지 따로 보인다.
 *
 * 조각의 실제 내용은 /sitemap/[id] 가 만든다.
 */
export const dynamic = "force-dynamic";

export async function GET() {
    const b = SITE.url;
    const today = new Date().toISOString().slice(0, 10);
    return xmlResponse(
        renderSitemapIndex([
            { loc: `${b}/sitemap/pages.xml`, lastmod: today },
            { loc: `${b}/sitemap/channels.xml`, lastmod: today },
        ]),
    );
}
