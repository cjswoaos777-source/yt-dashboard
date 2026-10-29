import { unstable_cache } from "next/cache";
import { SITE } from "@/lib/site";
import { getAllNotices } from "@/lib/notices";
import { getPublishedReports } from "@/lib/reports";
import { isSupabase } from "@/lib/datasource";
import { supabase } from "@/lib/supabase";
import {
    ARCHIVE_INDEX_MIN_DAYS,
    ARCHIVE_INDEX_MIN_RECENT_VIDEOS,
    CHANNEL_INDEX_MAX_STALE_DAYS,
    CHANNEL_INDEX_MIN_DAYS,
    kstDateDaysAgo,
} from "@/lib/channels";
import { CHANNEL_PAGE_MIN_SUBSCRIBERS } from "@/lib/channel-constants";
import { seoGroup, SEO_EXPERIMENT_START } from "@/lib/seo-experiment";
import { CATEGORY_SLUGS } from "@/lib/categories";

/**
 * sitemap 구성.
 *
 * 정적 페이지 + 공지 + 채널 상세(아카이브 기반).
 *
 * [2026-09-12] 채널 상세를 다시 넣는다.
 *   8월에 뺐던 이유는 채널 셋이 매일 ~17% 회전해 색인 후 404 가 됐기 때문이다.
 *   이제 상세 페이지가 channel_archive(영구 기록)에 묶여 순위에서 빠져도
 *   사라지지 않으므로 그 문제가 없다. Search Console 에서 채널 이름이 실제
 *   검색 유입 키워드로 잡히는 것도 확인했다.
 *
 *   태그 상세는 여전히 넣지 않는다 (회전율 ~45%/일, 아카이브 없음).
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

/** 사이트맵 인덱스 — 조각 사이트맵들의 목록 */
export function renderSitemapIndex(parts: { loc: string; lastmod?: string }[]): string {
    const body = parts
        .map((p) => {
            const items = [`<loc>${esc(p.loc)}</loc>`];
            if (p.lastmod) items.push(`<lastmod>${esc(p.lastmod)}</lastmod>`);
            return `<sitemap>${items.join("")}</sitemap>`;
        })
        .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;
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
        // [2026-10-27] 카테고리별 급상승 유튜버 순위. 카테고리 목록이 고정이라 여기 함께 담는다.
        { loc: `${b}/category`, changefreq: "daily", priority: 0.7 },
        ...CATEGORY_SLUGS.map((s) => ({ loc: `${b}/category/${s}`, changefreq: "daily", priority: 0.7 })),
        { loc: `${b}/insights`, changefreq: "weekly", priority: 0.7 },
        { loc: `${b}/insights/upload-time`, changefreq: "weekly", priority: 0.7 },
        { loc: `${b}/insights/shorts-vs-longform`, changefreq: "weekly", priority: 0.7 },
        { loc: `${b}/insights/channel-age`, changefreq: "weekly", priority: 0.7 },
        { loc: `${b}/report`, changefreq: "weekly", priority: 0.8 },
        { loc: `${b}/notice`, changefreq: "weekly", priority: 0.5 },
        { loc: `${b}/about`, changefreq: "monthly", priority: 0.4 },
        { loc: `${b}/about/metrics`, changefreq: "monthly", priority: 0.5 },
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
    // [2026-10-21] 주간 리포트 — 공개(published)된 것만. 사이트에서 가장 '고유한 글'이라 우선순위를 높게 둔다.
    let reports: SitemapUrl[] = [];
    try {
        reports = getPublishedReports().map((r) => ({
            loc: `${b}/report/${r.slug}`,
            ...(r.date && { lastmod: r.date }),
            changefreq: "monthly",
            priority: 0.8,
        }));
    } catch {
        // 리포트 읽기 실패해도 나머지는 내보낸다
    }
    return [...staticUrls, ...reports, ...notices];
}

/**
 * 사이트맵에 실을 채널의 최소 등장 일수.
 *
 * 페이지 메타의 색인 기준(CHANNEL_INDEX_MIN_DAYS = 3)보다 높게 잡는다.
 * 이유는 Vercel CPU 다. 새 URL 을 사이트맵에 올리면 구글이 발견·색인 단계로
 * 2~3번 크롤하는데, 상세 1건에 34ms 라 8,500개면 10~15분이 든다. 지금
 * 30일 롤링 예산이 21분밖에 안 남아(09-01 도메인 이전 때 재크롤 급증)
 * 10-01 경 회복될 때까지는 가장 탄탄한 페이지(7일 이상, 약 3,280개)만 싣는다.
 * 그 뒤 3 으로 내리면 된다. 상수 하나만 바꾸면 된다.
 *
 * 사이트맵에 없는 3~6일 채널도 페이지 자체는 index 라, 링크를 타고 발견되면
 * 색인된다. 사이트맵은 '먼저 알려주는' 역할이지 색인의 전제가 아니다.
 */
export const SITEMAP_CHANNEL_MIN_DAYS = CHANNEL_INDEX_MIN_DAYS;

/*
 * [2026-10-21] 7 → 14. 구글에는 14일 이상 채널만 색인시키기로 했다(GOOGLE_CHANNEL_MIN_DAYS).
 * 사이트맵은 구글도 읽으므로, googlebot noindex 인 페이지를 싣으면 서치콘솔이
 * '제출된 URL 에 noindex' 로 잡는다. 다음·빙은 7~13일 채널도 링크와 IndexNow
 * (sync_supabase.submit_indexnow, 3일 이상)로 계속 알게 된다.
 *
 * [2026-10-29] 14 → 3. 채널 조각은 이제 구글이 읽는 사이트맵 인덱스에 없다(sitemap.xml).
 * 빙·네이버·다음에 따로 제출하는 목록이라 페이지 meta robots(isIndexableChannel)와 같은
 * 기준으로 싣는다: 국내, 구독자 1만 이상(미만은 404), 3일 이상 + 30일 이내,
 * 그리고 30일 넘었어도 7일 이상 + 최근 30일 영상 5개 이상인 기록 채널(1단계).
 */

/*
 * [2026-10-12] 순위에서 빠진 지 30일이 넘은 채널(CHANNEL_INDEX_MAX_STALE_DAYS)은 싣지 않는다.
 * 페이지가 noindex 라 사이트맵에 있으면 서치콘솔이 '제출됐는데 noindex' 오류로 본다.
 * 4,406 → 약 2,500개.
 *
 * 해외 채널(IMPORTED)도 noindex 라 같은 이유로 뺀다 (isIndexableChannel). 약 2,140개.
 */

/**
 * 채널 상세 URL 목록 (아카이브 기준, 1시간 캐시).
 *
 * PostgREST 는 요청당 1,000행이 상한이라 range 로 나눠 받는다.
 * Supabase 경로가 아니면(GitHub 파일 시절) 안정적인 URL 이 없으므로 빈 배열.
 */
type ArchiveRow = { channel_id: string; last_seen: string };

/** 국내·구독자 1만 이상 기록 채널을 1,000행씩 나눠 받는다 (등장 일수·마지막 등장일 조건). */
async function fetchArchiveRows(minDays: number, lastSeen: { gte?: string; lt?: string }): Promise<ArchiveRow[]> {
    const sb = supabase();
    const rows: ArchiveRow[] = [];
    const PAGE = 1000;
    for (let from = 0; from < 50_000; from += PAGE) {
        let q = sb
            .from("channel_archive")
            .select("channel_id,last_seen")
            .eq("origin_type", "DOMESTIC")
            .gte("subscriber_count", CHANNEL_PAGE_MIN_SUBSCRIBERS)
            .gte("days_seen", minDays);
        if (lastSeen.gte) q = q.gte("last_seen", lastSeen.gte);
        if (lastSeen.lt) q = q.lt("last_seen", lastSeen.lt);
        const { data, error } = await q
            .order("last_seen", { ascending: false })
            .order("channel_id")
            .range(from, from + PAGE - 1);
        if (error) throw new Error(`사이트맵 채널 조회 실패: ${error.message}`);
        const page = (data ?? []) as unknown as ArchiveRow[];
        rows.push(...page);
        if (page.length < PAGE) break;
    }
    return rows;
}

/** 최근 30일 포착 영상이 n개 이상인 채널 (channel_recent) */
async function channelsWithRecentVideos(n: number): Promise<Set<string>> {
    const sb = supabase();
    const ids = new Set<string>();
    const PAGE = 1000;
    for (let from = 0; from < 50_000; from += PAGE) {
        const { data, error } = await sb
            .from("channel_recent")
            .select("channel_id")
            .gte("videos_30d", n)
            .order("channel_id")
            .range(from, from + PAGE - 1);
        if (error) throw new Error(`사이트맵 최근 영상 조회 실패: ${error.message}`);
        const page = (data ?? []) as unknown as { channel_id: string }[];
        for (const r of page) ids.add(r.channel_id);
        if (page.length < PAGE) break;
    }
    return ids;
}

const channelUrlsCached = unstable_cache(
    async (): Promise<SitemapUrl[]> => {
        if (!isSupabase) return [];
        const b = SITE.url;
        const cutoff = kstDateDaysAgo(CHANNEL_INDEX_MAX_STALE_DAYS);
        // ① 순위에 있거나 빠진 지 30일 이내
        const fresh = await fetchArchiveRows(SITEMAP_CHANNEL_MIN_DAYS, { gte: cutoff });
        // ② 30일 넘은 기록 채널 중 최근 영상이 계속 잡히는 것 (1단계, isIndexableChannel 과 같은 기준)
        const lively = await channelsWithRecentVideos(ARCHIVE_INDEX_MIN_RECENT_VIDEOS);
        const archived = (await fetchArchiveRows(ARCHIVE_INDEX_MIN_DAYS, { lt: cutoff }))
            .filter((r) => lively.has(r.channel_id));
        return [...fresh, ...archived].map((r) => ({
            loc: `${b}/channel/${r.channel_id}`,
            // [2026-10-24] SEO 실험 실험군은 그날 본문이 바뀌었으므로 lastmod 를 그 날짜 이후로 둔다
            // (사실과 맞는 lastmod. 바뀌지 않은 대조군은 그대로).
            lastmod: seoGroup(r.channel_id) === "treatment" && r.last_seen < SEO_EXPERIMENT_START
                ? SEO_EXPERIMENT_START : r.last_seen,   // YYYY-MM-DD 그대로 유효한 W3C 날짜다
            // 매시간 데이터가 바뀌지만 검색엔진이 매시간 와서 확인할 필요는 없다.
            // weekly 로 두어 재크롤 부담을 낮춘다.
            changefreq: "weekly",
            priority: 0.5,
        }));
    },
    ["sitemap-channels-v6", String(SITEMAP_CHANNEL_MIN_DAYS), String(CHANNEL_INDEX_MAX_STALE_DAYS),
        String(ARCHIVE_INDEX_MIN_DAYS), String(ARCHIVE_INDEX_MIN_RECENT_VIDEOS)],
    { revalidate: 3600 },
);

export async function channelUrls(): Promise<SitemapUrl[]> {
    try {
        return await channelUrlsCached();
    } catch {
        // 실패해도 사이트맵 전체가 깨지면 안 된다. 채널 조각만 비운다.
        return [];
    }
}
