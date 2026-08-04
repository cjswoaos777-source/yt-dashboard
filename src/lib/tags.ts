import { unstable_cache } from "next/cache";
import { TAG_INDEX_URL, getCdnVersion } from "@/lib/cdn";

export interface TagVideo {
    video_id: string;
    title: string;
    channel_title: string;
    category_name: string;
    sub_tier: string;
    video_type: string;
    total_views: number;
    hourly_view_increase: number;
    updated_at: string;
}

export interface TagEntry {
    tag: string;
    video_count: number;
    total_hourly_increase: number;
    videos: TagVideo[];
}

interface TagIndex {
    updated_at: string;
    tag_count: number;
    tags: TagEntry[];
}

/** 목록 허브 한 페이지에 실을 태그 수 */
export const TAG_LIST_PAGE_SIZE = 100;

/**
 * URL 에 쓰는 slug ↔ 원본 태그 변환.
 *
 * 태그에는 공백·슬래시·앰퍼샌드 등 무엇이든 들어올 수 있다. 문제 문자를 하나씩
 * 열거하면 반드시 빠뜨리므로(실제로 's&p500' 이 sitemap 의 XML 을 깨뜨렸다),
 * 허용할 문자만 남기는 방식으로 뒤집는다.
 *
 * 남기는 것: 유니코드 문자(한글 포함)·숫자·밑줄·마침표·하이픈.
 * 한글을 인코딩하지 않는 이유는 그래야 URL 이 검색어와 그대로 맞아떨어지기 때문이다.
 * 되돌릴 수 없는 변환이므로 조회는 원본이 아니라 slug 끼리 비교한다.
 */
export function tagToSlug(tag: string): string {
    return tag
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}_.-]+/gu, "-")
        .replace(/-+/g, "-")
        .replace(/^[-.]+|[-.]+$/g, "");
}

async function fetchTagIndex(): Promise<TagIndex> {
    const res = await fetch(TAG_INDEX_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`CDN fetch failed: ${res.status} ${res.statusText}`);

    const contentType = res.headers.get("content-type") ?? "";
    let raw: unknown;
    if (contentType.includes("gzip") || contentType.includes("octet-stream")) {
        const { promisify } = await import("util");
        const { gunzip } = await import("zlib");
        const gunzipAsync = promisify(gunzip);
        const buf = Buffer.from(await res.arrayBuffer());
        const decompressed = await gunzipAsync(buf);
        raw = JSON.parse(decompressed.toString("utf-8"));
    } else {
        raw = await res.json();
    }

    const idx = raw as TagIndex;
    return {
        updated_at: idx?.updated_at ?? "",
        tag_count: idx?.tag_count ?? 0,
        tags: Array.isArray(idx?.tags) ? idx.tags : [],
    };
}

/**
 * 태그 목록 (지금 뜨는 정도가 큰 순).
 *
 * 원본이 1MB 에 가까워 매 요청마다 받지 않도록 ETag 기준으로 캐싱한다.
 * 목록에는 영상 배열이 필요 없으므로 요약만 남겨 캐시를 가볍게 유지한다.
 */
const getTagListCached = (version: string) => unstable_cache(
    async (
        page: number,
    ): Promise<{
        items: Omit<TagEntry, "videos">[];
        total: number;
        totalPages: number;
        updatedAt: string;
    }> => {
        const idx = await fetchTagIndex();
        const summaries = idx.tags.map(({ tag, video_count, total_hourly_increase }) => ({
            tag,
            video_count,
            total_hourly_increase,
        }));

        const totalPages = Math.max(1, Math.ceil(summaries.length / TAG_LIST_PAGE_SIZE));
        const safePage = Math.min(Math.max(1, page), totalPages);
        const start = (safePage - 1) * TAG_LIST_PAGE_SIZE;

        return {
            items: summaries.slice(start, start + TAG_LIST_PAGE_SIZE),
            total: summaries.length,
            totalPages,
            updatedAt: idx.updated_at,
        };
    },
    ["tag-list-v2", version],
    { revalidate: 3600 },
);

export async function getTagListPage(page: number) {
    return getTagListCached(await getCdnVersion(TAG_INDEX_URL))(page);
}

/** sitemap 용 slug 목록 */
// -v2: tagToSlug 규칙이 바뀌면 저장된 slug 도 무효화해야 한다.
// (Vercel Data Cache 는 배포가 바뀌어도 유지되므로 키를 올리지 않으면 옛 값이 계속 나온다.)
const getTagSlugsCached = (version: string) => unstable_cache(
    async (): Promise<string[]> => {
        const idx = await fetchTagIndex();
        return idx.tags.map((t) => tagToSlug(t.tag)).filter(Boolean);
    },
    ["tag-slugs-v2", version],
    { revalidate: 3600 },
)();

export async function getTagSlugs(): Promise<string[]> {
    return getTagSlugsCached(await getCdnVersion(TAG_INDEX_URL));
}

/**
 * 단일 태그 조회. slug 로 찾으므로 대소문자·공백 표기가 달라도 걸린다.
 * 없으면 null 을 반환해 호출부에서 404 처리한다.
 */
const getTagCached = (version: string, slug: string) => unstable_cache(
    async (): Promise<{ entry: TagEntry; related: string[] } | null> => {
        const idx = await fetchTagIndex();
        const entry = idx.tags.find((t) => tagToSlug(t.tag) === slug);
        if (!entry) return null;

        // 같은 카테고리에서 자주 보이는 다른 태그를 관련 태그로 제시한다.
        // 내부 링크가 늘어 크롤러가 태그 페이지들을 따라가기 쉬워진다.
        const cats = new Set(entry.videos.map((v) => v.category_name).filter(Boolean));
        const related = idx.tags
            .filter(
                (t) =>
                    t.tag !== entry.tag &&
                    t.videos.some((v) => cats.has(v.category_name)),
            )
            .slice(0, 12)
            .map((t) => t.tag);

        return { entry, related };
    },
    ["tag-detail-v2", version, slug],
    { revalidate: 3600 },
)();

export async function getTag(slug: string) {
    return getTagCached(await getCdnVersion(TAG_INDEX_URL), slug);
}
