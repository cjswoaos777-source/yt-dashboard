import { unstable_cache } from "next/cache";
import { TAG_INDEX_URL, getCdnVersion } from "@/lib/cdn";
import { isSupabase } from "@/lib/datasource";
import { supabase } from "@/lib/supabase";

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

// ─── Supabase 경로 ───────────────────────────────────────────────────────────
//
// GitHub 경로는 태그 1개를 보려고 1MB 인덱스(태그 2,600개 + 영상 배열)를
// 통째로 받아 파싱했고, 캐시 키에 slug 가 들어 있어 태그마다 그 일을 따로 했다.
// 여기서는 tag / tag_video / video_ranking 세 테이블에서 필요한 행만 받는다.

const SB_REVALIDATE = 1800;

const sbTagList = unstable_cache(
    async (
        page: number,
    ): Promise<{
        items: Omit<TagEntry, "videos">[];
        total: number;
        totalPages: number;
        updatedAt: string;
    }> => {
        const sb = supabase();

        const { count, error: cErr } = await sb
            .from("tag")
            .select("slug", { count: "exact", head: true });
        if (cErr) throw new Error(`Supabase 태그 수 조회 실패: ${cErr.message}`);
        const total = count ?? 0;

        const totalPages = Math.max(1, Math.ceil(total / TAG_LIST_PAGE_SIZE));
        const safePage = Math.min(Math.max(1, page), totalPages);
        const start = (safePage - 1) * TAG_LIST_PAGE_SIZE;

        const { data, error } = await sb
            .from("tag")
            .select("tag,video_count,total_hourly_increase")
            .order("total_hourly_increase", { ascending: false })
            .range(start, start + TAG_LIST_PAGE_SIZE - 1);
        if (error) throw new Error(`Supabase 태그 목록 조회 실패: ${error.message}`);

        // 인덱스 파일에 있던 updated_at 은 테이블에 없다. 영상 스냅샷 시각을 쓴다.
        const { data: up } = await sb
            .from("video_ranking")
            .select("updated_at")
            .order("updated_at", { ascending: false })
            .limit(1);

        return {
            items: (data ?? []) as Omit<TagEntry, "videos">[],
            total,
            totalPages,
            updatedAt: up?.[0]?.updated_at ?? "",
        };
    },
    ["sb-tag-list-v1"],
    { revalidate: SB_REVALIDATE },
);

export async function getTagListPage(page: number) {
    if (isSupabase) return sbTagList(page);
    return getTagListCached(await getCdnVersion(TAG_INDEX_URL))(page);
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

/** TagVideo 로 그대로 매핑되는 컬럼 */
const TAG_VIDEO_COLUMNS =
    "video_id,title,channel_title,category_name,sub_tier,video_type," +
    "total_views,hourly_view_increase,updated_at";

function sbTagCached(slug: string) {
    return unstable_cache(
        async (): Promise<{ entry: TagEntry; related: string[] } | null> => {
            const sb = supabase();

            // ① 태그 본체. slug 가 기본키라 바로 찾는다.
            const { data: t, error: tErr } = await sb
                .from("tag")
                .select("slug,tag,video_count,total_hourly_increase")
                .eq("slug", slug)
                .maybeSingle();
            if (tErr) throw new Error(`Supabase 태그 조회 실패: ${tErr.message}`);
            if (!t) return null;

            // ② 이 태그의 영상 id 들 (순위대로). 태그당 최대 30개다.
            const { data: links, error: lErr } = await sb
                .from("tag_video")
                .select("video_id,rank")
                .eq("tag_slug", slug)
                .order("rank");
            if (lErr) throw new Error(`Supabase 태그-영상 조회 실패: ${lErr.message}`);
            const ids = (links ?? []).map((l) => l.video_id as string);

            // ③ 영상 상세. tag_video 는 video_ranking 과 외래키가 없어 PostgREST 가
            //    자동으로 묶어주지 못하므로 id 로 따로 받아 순위대로 다시 세운다.
            //    (파이프라인이 두 테이블을 같은 스냅샷에서 TRUNCATE+COPY 하지만
            //     별개 트랜잭션은 아니라서, 외래키를 걸면 적재 순서 제약이 생긴다)
            let videos: TagVideo[] = [];
            if (ids.length > 0) {
                const { data: vs, error: vErr } = await sb
                    .from("video_ranking")
                    .select(TAG_VIDEO_COLUMNS)
                    .in("video_id", ids);
                if (vErr) throw new Error(`Supabase 태그 영상 조회 실패: ${vErr.message}`);
                const byId = new Map(
                    ((vs ?? []) as unknown as TagVideo[]).map((v) => [v.video_id, v]),
                );
                videos = ids.map((id) => byId.get(id)).filter((v): v is TagVideo => Boolean(v));
            }

            // ④ 관련 태그 — 이 태그의 영상들에 함께 달린 다른 태그.
            //
            //    GitHub 경로는 '같은 카테고리에 속한 태그'를 골랐는데, 그러려면
            //    태그 2,600개의 영상 배열을 전부 훑어야 했다. 여기서는 영상을
            //    실제로 공유하는 태그를 고른다. 한 번의 조회로 끝나고, 같은 영상에
            //    함께 달린 태그라 '관련' 이라는 뜻에도 더 가깝다.
            let related: string[] = [];
            if (ids.length > 0) {
                const { data: co, error: cErr } = await sb
                    .from("tag_video")
                    .select("tag_slug, tag!inner(tag)")
                    .in("video_id", ids)
                    .neq("tag_slug", slug)
                    .limit(200);
                if (cErr) throw new Error(`Supabase 관련 태그 조회 실패: ${cErr.message}`);

                // 같은 태그가 여러 영상에 걸리면 여러 번 나온다. 많이 겹칠수록
                // 관련이 깊다고 보고, 겹친 횟수순으로 12개를 고른다.
                const freq = new Map<string, number>();
                for (const row of (co ?? []) as unknown as { tag: { tag: string } | null }[]) {
                    const name = row.tag?.tag;
                    if (name) freq.set(name, (freq.get(name) ?? 0) + 1);
                }
                related = Array.from(freq.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 12)
                    .map(([name]) => name);
            }

            const entry: TagEntry = {
                tag: t.tag,
                video_count: t.video_count,
                total_hourly_increase: t.total_hourly_increase,
                videos,
            };
            return { entry, related };
        },
        ["sb-tag-detail-v1", slug],
        { revalidate: SB_REVALIDATE },
    )();
}

export async function getTag(slug: string) {
    if (isSupabase) return sbTagCached(slug);
    return getTagCached(await getCdnVersion(TAG_INDEX_URL), slug);
}
