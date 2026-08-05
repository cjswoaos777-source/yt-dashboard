import {
    SITEMAP_CHUNK_SIZE,
    renderSitemapIndex,
    xmlResponse,
    safeChannelIds,
    safeTagSlugs,
} from "@/lib/sitemap-parts";
import { SITE } from "@/lib/site";

// 조각 개수를 알려면 데이터 건수가 필요하다. 조회 함수는 ETag 기준으로 캐싱돼 있어
// 원본이 바뀔 때만 실제로 내려받는다.
export const dynamic = "force-dynamic";

export async function GET() {
    const b = SITE.url;
    const locs = [`${b}/sitemap/pages.xml`];

    // 실패해도 인덱스 자체는 나가야 한다. 최소한 pages.xml 은 항상 유효하다.
    const [channels, tags] = await Promise.all([safeChannelIds(), safeTagSlugs()]);

    const chCount = Math.ceil(channels.length / SITEMAP_CHUNK_SIZE);
    for (let i = 0; i < chCount; i++) locs.push(`${b}/sitemap/channels-${i}.xml`);

    const tagCount = Math.ceil(tags.length / SITEMAP_CHUNK_SIZE);
    for (let i = 0; i < tagCount; i++) locs.push(`${b}/sitemap/tags-${i}.xml`);

    return xmlResponse(renderSitemapIndex(locs));
}
