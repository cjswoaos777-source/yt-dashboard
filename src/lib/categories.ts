import { unstable_cache } from "next/cache";
import { hasChannelPage } from "@/lib/channel-constants";
import { isSupabase } from "@/lib/datasource";
import { supabase } from "@/lib/supabase";
import { channelAgeDays, NEW_CHANNEL_DAYS } from "@/lib/tier-channel-types";

/**
 * 카테고리별 급상승 유튜버 순위 (2026-10-27).
 *
 * "게임 유튜버 순위" 같은 검색어에 대응하도록 카테고리마다 고유 URL 을 준다.
 *
 * 채널 순위(channel_ranking)는 구독자 대비 조회수가 터지는 채널을 골라 추적한 집합이다.
 * 국내 4,000개 중 구독자 10만 이상이 10개, 100만 이상은 0개라 구독자순으로 세우면
 * '유튜버 순위'로 읽히지 않는다. 그래서 일평균 조회수 증가 순으로 세우고, 페이지에서
 * 전체 구독자 순위가 아님을 밝힌다.
 *
 * 상위권은 구독자 1만 미만 채널이 많아(게임 상위 8개 중 6개) 1만 미만도 함께 싣는다.
 * 그런 채널은 우리 상세 페이지가 없으므로(CHANNEL_PAGE_MIN_SUBSCRIBERS) 유튜브 채널로 링크한다.
 *
 * 싣지 않는 카테고리
 *   News & Politics          정치 주제는 다루지 않는다
 *   Nonprofits & Activism    5개뿐이다
 *   Overall                  영상이 없어 분류를 정하지 못한 채널 (tracker.py 폴백)
 *   Science & Technology, Autos & Vehicles   순위 채널이 20~30개라 아직 얇다
 */

/** URL 에 쓰는 이름. 순서는 목록 페이지에 보이는 순서다. */
export const CATEGORY_SLUGS = [
    "game", "entertainment", "people", "film", "sports", "education",
    "music", "comedy", "howto", "travel", "pets",
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

/** category 는 main_category 값(유튜브 카테고리 영문 이름)이다. */
export const CATEGORY_META: Record<
    CategorySlug,
    { category: string; label: string; description: string }
> = {
    game: {
        category: "Gaming",
        label: "게임",
        description: "게임 플레이·공략·리뷰처럼 게임을 다루는 채널입니다.",
    },
    entertainment: {
        category: "Entertainment",
        label: "엔터테인먼트",
        description: "예능·연예·방송 클립처럼 즐길 거리를 다루는 채널입니다.",
    },
    people: {
        category: "People & Blogs",
        label: "인물·블로그",
        description:
            "일상·브이로그·인물 이야기처럼 사람 중심의 영상을 올리는 채널입니다. " +
            "영상을 올릴 때 기본으로 지정되는 분류라 가장 많은 채널이 속해 있습니다.",
    },
    film: {
        category: "Film & Animation",
        label: "영화·애니메이션",
        description: "영화·드라마 리뷰와 요약, 애니메이션을 다루는 채널입니다.",
    },
    sports: {
        category: "Sports",
        label: "스포츠",
        description: "축구·야구·격투기 같은 경기 영상과 운동 이야기를 다루는 채널입니다.",
    },
    education: {
        category: "Education",
        label: "교육",
        description: "지식·역사·공부·직업 정보처럼 배울 거리를 다루는 채널입니다.",
    },
    music: {
        category: "Music",
        label: "음악",
        description: "노래·커버·공연처럼 음악을 다루는 채널입니다.",
    },
    comedy: {
        category: "Comedy",
        label: "코미디",
        description: "콩트·개그·웃긴 영상처럼 웃음을 주는 채널입니다.",
    },
    howto: {
        category: "Howto & Style",
        label: "노하우·스타일",
        description: "살림·생활 꿀팁·뷰티·패션처럼 방법과 요령을 알려 주는 채널입니다.",
    },
    travel: {
        category: "Travel & Events",
        label: "여행",
        description: "국내외 여행·지역 탐방·행사를 다루는 채널입니다.",
    },
    pets: {
        category: "Pets & Animals",
        label: "동물",
        description: "강아지·고양이 같은 반려동물과 동물 영상을 다루는 채널입니다.",
    },
};

export function isCategorySlug(v: string): v is CategorySlug {
    return (CATEGORY_SLUGS as readonly string[]).includes(v);
}

/** 순위 표에 실을 채널 수 */
const TOP_LIMIT = 30;
/** 구독자 증가·신생 채널 목록에 실을 채널 수 */
const SIDE_LIMIT = 10;
/** 순위 채널이 이보다 적은 날은 얇은 페이지라 검색에서 뺀다 (페이지는 그대로 연다) */
export const CATEGORY_MIN_RANKED = 10;

export interface CategoryChannel {
    channel_id: string;
    channel_title: string;
    subscriber_count: number;
    avg_daily_view_increase: number;
    avg_daily_sub_increase: number;
    league_group: string;
    /** 개설 후 지난 일수. 개설일을 모르면 null */
    ageDays: number | null;
}

export interface CategorySnapshot {
    /** 이 카테고리에서 추적 중인 국내 채널 수 */
    tracked: number;
    /** 순위에 오른 채널 수 (일평균 조회수 증가가 0 보다 큰 채널) */
    ranked: number;
    /** 순위 채널의 형식별 수 (league_group) */
    shorts: number;
    long: number;
    hybrid: number;
    /** 순위 채널 중 개설 NEW_CHANNEL_DAYS 일 이내 */
    newChannels: number;
    /** 순위 채널 구독자 중위값 */
    medianSubscribers: number;
    /** 일평균 조회수 증가 순 */
    top: CategoryChannel[];
    /** 일평균 구독자 증가 순 */
    topSubs: CategoryChannel[];
    /** 개설 NEW_CHANNEL_DAYS 일 이내 채널의 일평균 조회수 증가 순 */
    newest: CategoryChannel[];
}

export interface CategoryOverview {
    /** 데이터 기준일 (YYYY-MM-DD) */
    targetDate: string;
    categories: Record<CategorySlug, CategorySnapshot>;
}

/** 신생 채널인가 (벤치마킹의 '신규 채널'과 같은 기준) */
export function isNewChannel(c: Pick<CategoryChannel, "ageDays">): boolean {
    return c.ageDays !== null && c.ageDays <= NEW_CHANNEL_DAYS;
}

/** 우리 상세 페이지가 있으면 그리로, 없으면(구독자 1만 미만) 유튜브 채널로 */
export function channelLink(
    c: Pick<CategoryChannel, "channel_id" | "subscriber_count">,
): { href: string; external: boolean } {
    return hasChannelPage(c.subscriber_count)
        ? { href: `/channel/${c.channel_id}`, external: false }
        : { href: `https://www.youtube.com/channel/${c.channel_id}`, external: true };
}

// ─── Supabase 경로 ───────────────────────────────────────────────────────────
//
// 11개 카테고리의 국내 채널(약 3,500행)을 한 번에 받아 모든 페이지의 값을 함께 만든다.
// 목록 페이지와 카테고리 페이지가 이 결과 하나를 나눠 쓰므로 캐시 항목도 하나다 (약 80KB).
// GitHub 파일 경로는 두지 않는다 — 2026-09-13 부터 Supabase 만 갱신된다.

/** channels.ts 와 같다. 파이프라인이 매시간 통째로 갈아끼우므로 30분이면 늦어도 한 시간 안에 반영된다. */
const SB_REVALIDATE = 1800;

/** PostgREST 는 요청당 1,000행이 상한이라 나눠 받는다. */
const PAGE = 1000;

const COLUMNS =
    "channel_id,channel_title,main_category,subscriber_count,avg_daily_view_increase," +
    "avg_daily_sub_increase,league_group,channel_created_at,target_date";

interface Row {
    channel_id: string;
    channel_title: string;
    main_category: string;
    subscriber_count: number | null;
    avg_daily_view_increase: number | null;
    avg_daily_sub_increase: number | null;
    league_group: string | null;
    channel_created_at: string | null;
    target_date: string | null;
}

async function fetchRows(): Promise<Row[]> {
    const categories = CATEGORY_SLUGS.map((s) => CATEGORY_META[s].category);
    const query = (count: boolean) =>
        supabase()
            .from("channel_ranking")
            .select(COLUMNS, count ? { count: "exact" } : undefined)
            .eq("origin_type", "DOMESTIC")
            .in("main_category", categories)
            .order("channel_id");

    const first = await query(true).range(0, PAGE - 1);
    if (first.error) throw new Error(`Supabase 카테고리 채널 조회 실패: ${first.error.message}`);
    const total = first.count ?? 0;
    const rest = await Promise.all(
        Array.from({ length: Math.max(0, Math.ceil(total / PAGE) - 1) }, (_, i) =>
            query(false).range((i + 1) * PAGE, (i + 2) * PAGE - 1),
        ),
    );

    // 받는 사이에 표가 갈아끼워지면 같은 채널이 두 번 올 수 있어 channel_id 로 하나만 남긴다.
    const byId = new Map<string, Row>();
    for (const r of [first, ...rest]) {
        if (r.error) throw new Error(`Supabase 카테고리 채널 조회 실패: ${r.error.message}`);
        for (const row of (r.data ?? []) as unknown as Row[]) byId.set(row.channel_id, row);
    }
    // 갈아끼우는 중에 읽으면 비거나 모자랄 수 있다. 실패로 돌려야 그 결과가 캐시에 남지 않는다.
    if (byId.size === 0 || byId.size < total * 0.95) {
        throw new Error(`카테고리 채널이 ${total}개인데 ${byId.size}개만 받았습니다.`);
    }
    return [...byId.values()];
}

function toChannel(r: Row): CategoryChannel {
    return {
        channel_id: r.channel_id,
        channel_title: r.channel_title,
        subscriber_count: r.subscriber_count ?? 0,
        // 소수가 섞여 올 수 있어 정수로 맞춘다 (화면에 '45.5명' 같은 값이 나오지 않게)
        avg_daily_view_increase: Math.round(r.avg_daily_view_increase ?? 0),
        avg_daily_sub_increase: Math.round(r.avg_daily_sub_increase ?? 0),
        league_group: r.league_group ?? "",
        ageDays: channelAgeDays(r),
    };
}

function toSnapshot(rows: Row[]): CategorySnapshot {
    // 추적 첫날은 비교할 값이 없어 일평균이 0 이다(isAwaitingBaseline). 성장이 0 이 아니라
    // 계산 불가이므로 순위에서 뺀다. 성장이 멈춘 채널도 빠진다 (/channel 목록과 같은 기준).
    const ranked = rows
        .filter((r) => (r.avg_daily_view_increase ?? 0) > 0)
        .map(toChannel)
        .sort((a, b) => b.avg_daily_view_increase - a.avg_daily_view_increase);
    const subs = ranked.map((c) => c.subscriber_count).sort((a, b) => a - b);

    return {
        tracked: rows.length,
        ranked: ranked.length,
        shorts: ranked.filter((c) => c.league_group === "SHORTS").length,
        long: ranked.filter((c) => c.league_group === "LONG").length,
        hybrid: ranked.filter((c) => c.league_group === "HYBRID").length,
        newChannels: ranked.filter(isNewChannel).length,
        medianSubscribers: subs.length ? subs[Math.floor(subs.length / 2)] : 0,
        top: ranked.slice(0, TOP_LIMIT),
        topSubs: ranked
            .filter((c) => c.avg_daily_sub_increase > 0)
            .sort((a, b) => b.avg_daily_sub_increase - a.avg_daily_sub_increase)
            .slice(0, SIDE_LIMIT),
        newest: ranked.filter(isNewChannel).slice(0, SIDE_LIMIT),
    };
}

const sbCategoryOverview = unstable_cache(
    async (): Promise<CategoryOverview> => {
        const rows = await fetchRows();
        const byCategory = new Map<string, Row[]>();
        for (const r of rows) {
            const list = byCategory.get(r.main_category) ?? [];
            list.push(r);
            byCategory.set(r.main_category, list);
        }
        const categories = Object.fromEntries(
            CATEGORY_SLUGS.map((s) => [s, toSnapshot(byCategory.get(CATEGORY_META[s].category) ?? [])]),
        ) as Record<CategorySlug, CategorySnapshot>;
        const targetDate = rows.reduce(
            (m, r) => (r.target_date && r.target_date > m ? r.target_date : m),
            "",
        );
        return { targetDate, categories };
    },
    ["sb-category-overview-v1"],
    { revalidate: SB_REVALIDATE },
);

export async function getCategoryOverview(): Promise<CategoryOverview | null> {
    if (!isSupabase) return null;
    try {
        return await sbCategoryOverview();
    } catch (e) {
        console.error("[categories]", e);
        return null;
    }
}
