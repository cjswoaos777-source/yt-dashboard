import {
    SITEMAP_CHUNK_SIZE,
    renderUrlset,
    xmlResponse,
    pagesUrls,
    safeChannelIds,
    safeTagSlugs,
    chunk,
    type SitemapUrl,
} from "@/lib/sitemap-parts";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const name = decodeURIComponent(id).replace(/\.xml$/, "");
    const b = SITE.url;

    if (name === "pages") {
        return xmlResponse(renderUrlset(pagesUrls()));
    }

    const m = name.match(/^(channels|tags)-(\d+)$/);
    if (!m) {
        // 알 수 없는 조각도 HTML 404 대신 빈 XML 로 답한다.
        // 사이트맵 경로에서 HTML 이 나가면 서치콘솔이 전체를 거부한다.
        return xmlResponse(renderUrlset([]));
    }

    const [, kind, idxStr] = m;
    const idx = Number.parseInt(idxStr, 10);

    let urls: SitemapUrl[] = [];
    if (kind === "channels") {
        const parts = chunk(await safeChannelIds(), SITEMAP_CHUNK_SIZE);
        urls = (parts[idx] ?? []).map((cid) => ({
            loc: `${b}/channel/${cid}`,
            changefreq: "daily",
            priority: 0.6,
        }));
    } else {
        const parts = chunk(await safeTagSlugs(), SITEMAP_CHUNK_SIZE);
        urls = (parts[idx] ?? []).map((slug) => ({
            loc: `${b}/tag/${slug}`,
            changefreq: "hourly",
            priority: 0.6,
        }));
    }

    return xmlResponse(renderUrlset(urls));
}
