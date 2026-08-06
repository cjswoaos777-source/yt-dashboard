import { SITE } from "@/lib/site";
import { getAllNotices } from "@/lib/notices";
import { getIndexableChannelIds } from "@/lib/channels";
import { getTagSlugs } from "@/lib/tags";

/**
 * 분할 sitemap 구성.
 *
 * 단일 sitemap 으로 4,000개 URL 을 열거하던 방식은 캐시가 비었을 때 채널 1.4MB +
 * 태그 1MB 를 받아 가공하느라 응답이 매우 느려져 Vercel 함수 제한에 걸릴 수 있었다.
 * 그때 XML 대신 HTML 에러 페이지가 나가면 서치콘솔이 사이트맵 자체를 거부한다.
 *
 * 그래서 (1) 종류별·크기별로 잘게 나누고, (2) 데이터 조회는 ETag 기준으로 캐싱된
 * 기존 함수를 재사용하며, (3) 어떤 실패에도 HTML 이 아니라 빈 XML 을 돌려준다.
 */

/** 한 조각에 담을 최대 URL 수. 구글 상한(50,000)보다 훨씬 작게 잡아 응답을 가볍게 유지한다. */
export const SITEMAP_CHUNK_SIZE = 1000;

export interface SitemapUrl {
    loc: string;
    lastmod?: string;
    changefreq?: string;
    priority?: number;
}

/** XML 특수문자 이스케이프. 태그에 &, ' 등이 들어올 수 있어 반드시 거쳐야 한다. */
function esc(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export function renderUrlset(urls: SitemapUrl[]): string {
    const body = urls
        .map((u) => {
            const parts = [`<loc>${esc(u.loc)}</loc>`];
            if (u.lastmod) parts.push(`<lastmod>${esc(u.lastmod)}</lastmod>`);
            if (u.changefreq) parts.push(`<changefreq>${esc(u.changefreq)}</changefreq>`);
            if (u.priority !== undefined) parts.push(`<priority>${u.priority}</priority>`);
            return `<url>${parts.join("")}</url>`;
        })
        .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

export function renderSitemapIndex(locs: string[]): string {
    const body = locs.map((l) => `<sitemap><loc>${esc(l)}</loc></sitemap>`).join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;
}

/** XML 응답 공통 헤더. 실패해도 이 함수를 거치므로 Content-Type 이 항상 XML 이다. */
export function xmlResponse(body: string): Response {
    return new Response(body, {
        status: 200,
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            // 구글이 자주 읽지 않으므로 짧게 잡을 이유가 없다. 데이터가 바뀌어도
            // 다음 조각 요청 때 캐시된 값으로 빠르게 응답된다.
            "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
        },
    });
}

/** 정적 페이지 + 공지 (네트워크 의존 없음) */
export function pagesUrls(): SitemapUrl[] {
    const b = SITE.url;
    const staticUrls: SitemapUrl[] = [
        { loc: b, changefreq: "daily", priority: 1 },
        { loc: `${b}/dashboard`, changefreq: "hourly", priority: 0.9 },
        { loc: `${b}/dashboard/benchmarking`, changefreq: "hourly", priority: 0.8 },
        { loc: `${b}/channel`, changefreq: "daily", priority: 0.8 },
        { loc: `${b}/tag`, changefreq: "hourly", priority: 0.8 },
        { loc: `${b}/tier`, changefreq: "daily", priority: 0.7 },
        // 구독자 구간은 4개로 고정이라 별도 조각 없이 여기 함께 담는다.
        { loc: `${b}/tier/tier1`, changefreq: "hourly", priority: 0.7 },
        { loc: `${b}/tier/tier2`, changefreq: "hourly", priority: 0.7 },
        { loc: `${b}/tier/tier3`, changefreq: "hourly", priority: 0.7 },
        { loc: `${b}/tier/micro`, changefreq: "hourly", priority: 0.7 },
        { loc: `${b}/insights`, changefreq: "weekly", priority: 0.7 },
        { loc: `${b}/insights/upload-time`, changefreq: "weekly", priority: 0.7 },
        { loc: `${b}/insights/shorts-vs-longform`, changefreq: "weekly", priority: 0.7 },
        { loc: `${b}/insights/channel-age`, changefreq: "weekly", priority: 0.7 },
        { loc: `${b}/notice`, changefreq: "weekly", priority: 0.5 },
        { loc: `${b}/about`, changefreq: "monthly", priority: 0.4 },
    ];

    let notices: SitemapUrl[] = [];
    try {
        notices = getAllNotices().map((n) => ({
            loc: `${b}/notice/${n.slug}`,
            ...(n.date && { lastmod: new Date(n.date).toISOString() }),
            changefreq: "monthly",
            priority: 0.3,
        }));
    } catch {
        // 공지 읽기 실패해도 정적 URL 은 내보낸다
    }
    return [...staticUrls, ...notices];
}

/** 조회 실패 시 빈 배열. 절대 예외를 던지지 않는다(던지면 HTML 500 이 나간다). */
export async function safeChannelIds(): Promise<string[]> {
    try {
        return await getIndexableChannelIds();
    } catch {
        return [];
    }
}

export async function safeTagSlugs(): Promise<string[]> {
    try {
        return await getTagSlugs();
    } catch {
        return [];
    }
}

export function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}
