import { SITE } from "@/lib/site";
import { getAllNotices } from "@/lib/notices";

/**
 * sitemap 구성.
 *
 * 색인 대상은 URL 이 안정적인 정적 페이지 + 공지뿐이다. 채널·태그 상세는
 * 데이터 셋이 매일 크게 회전해(채널 ~17%/일, 태그 ~45%/일) 색인 후 404 가
 * 되므로 사이트맵에서 제외하고 페이지 메타데이터에 noindex 를 달았다.
 *
 * 사이트맵 경로에서 HTML 에러가 나가면 서치콘솔이 사이트맵 자체를 거부하므로
 * 어떤 실패에도 HTML 이 아니라 XML 을 돌려준다.
 */

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
