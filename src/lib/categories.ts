import { unstable_cache } from "next/cache";
import { isSupabase } from "@/lib/datasource";
import { supabase } from "@/lib/supabase";
import { channelAgeDays, NEW_CHANNEL_DAYS } from "@/lib/tier-channel-types";

/**
 * 카테고리별 급상승 유튜버 순위 (2026-10-27).
 *
 * "게임 유튜버 순위" 같은 검색어에 대응하도록 카테고리마다 고유 URL 을 준다.
 *
 * [2026-10-31] 원본을 channel_ranking(바이럴 점수로 미리 고른 8,000곳)에서 channel_board(최근 7일 안에
 * 수집된 국내 채널 전부)로 바꿨다. 지금 뜨는 채널(/channel)과 같은 표다. 줄 세우는 기준도 같은
 * 떠오르는 순(일평균 조회수 증가 ÷ (구독자 + 1만))이다 (사용자 결정: 기본은 어디서나 떠오르는 순).
 * 큰 채널도 들어 있으므로 조회수 증가 순으로 세우면 구독자 수백만 채널이 위를 채운다.
 *
 * 보드는 2만 4천 행이라 통째로 받지 않는다. 카테고리별 숫자와 상위 목록은 보드를 바꿀 때 DB 가 미리
 * 계산해 둔다 (구체화 뷰, utube_rank/sql/steps/20_channel_board_category.sql · channel_board_sync.py).
 *
 * 싣지 않는 카테고리
 *   News & Politics          정치 주제는 다루지 않는다
 *   Nonprofits & Activism    5개뿐이다
 *   Overall                  영상이 없어 분류를 정하지 못한 채널 (tracker.py 폴백)
 *   Science & Technology, Autos & Vehicles   순위 채널이 20~30개라 얇았다. 보드로 바꾼 뒤에는
 *                            250~280곳이라 새 페이지로 열 수 있다 (새 주소라 SEO 결정이 필요해 아직 안 열었다)
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
    /** 우리 채널 분석 페이지가 있다 (channel_board.has_page) */
    hasPage: boolean;
}

export interface CategorySnapshot {
    /** 이 카테고리의 국내 채널 수 (최근 7일 안에 수집된 채널) */
    tracked: number;
    /** 순위에 오른 채널 수 (일평균을 낼 만큼 숫자가 쌓였고 조회수가 는 채널) */
    ranked: number;
    /** 순위 채널의 형식별 수 (league_group) */
    shorts: number;
    long: number;
    hybrid: number;
    /** 순위 채널 중 개설 NEW_CHANNEL_DAYS 일 이내 */
    newChannels: number;
    /** 순위 채널 구독자 중위값 */
    medianSubscribers: number;
    /** 떠오르는 순 (일평균 조회수 증가 ÷ (구독자 + 1만)) */
    top: CategoryChannel[];
    /** 일평균 구독자 증가 순 */
    topSubs: CategoryChannel[];
    /** 개설 NEW_CHANNEL_DAYS 일 이내 채널의 떠오르는 순 */
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

/** 우리 채널 분석 페이지가 있으면 그리로, 없으면 유튜브 채널로 */
export function channelLink(
    c: Pick<CategoryChannel, "channel_id" | "hasPage">,
): { href: string; external: boolean } {
    return c.hasPage
        ? { href: `/channel/${c.channel_id}`, external: false }
        : { href: `https://www.youtube.com/channel/${c.channel_id}`, external: true };
}

// ─── Supabase 경로 ───────────────────────────────────────────────────────────
//
// 구체화 뷰 두 개를 한 번씩 읽어 모든 페이지의 값을 함께 만든다 (숫자 11행 + 목록 최대 550행).
// 목록 페이지와 카테고리 페이지가 이 결과 하나를 나눠 쓰므로 캐시 항목도 하나다 (약 80KB).
// GitHub 파일 경로는 두지 않는다 — 2026-09-13 부터 Supabase 만 갱신된다.

/** 보드는 하루 한 번(저녁) 바뀐다. 30분이면 늦어도 한 시간 안에 반영된다. */
const SB_REVALIDATE = 1800;

const STATS_COLUMNS =
    "main_category,target_date,tracked,ranked,shorts,long,hybrid,new_channels,median_subscribers";

const TOP_COLUMNS =
    "list,rk,channel_id,channel_title,main_category,league_group,channel_created_at," +
    "subscriber_count,avg_daily_view_increase,avg_daily_sub_increase,has_page";

interface StatsRow {
    main_category: string;
    target_date: string | null;
    tracked: number;
    ranked: number;
    shorts: number;
    long: number;
    hybrid: number;
    new_channels: number;
    median_subscribers: number | null;
}

/** 뷰의 list: rising 떠오르는 순 30 · subs 구독자 증가 순 10 · new 개설 90일 이내 떠오르는 순 10 */
interface TopRow {
    list: "rising" | "subs" | "new";
    rk: number;
    channel_id: string;
    channel_title: string;
    main_category: string;
    league_group: string | null;
    channel_created_at: string | null;
    subscriber_count: number | null;
    avg_daily_view_increase: number | null;
    avg_daily_sub_increase: number | null;
    has_page: boolean | null;
}

function toChannel(r: TopRow): CategoryChannel {
    return {
        channel_id: r.channel_id,
        channel_title: r.channel_title,
        subscriber_count: r.subscriber_count ?? 0,
        // 소수가 섞여 올 수 있어 정수로 맞춘다 (화면에 '45.5명' 같은 값이 나오지 않게)
        avg_daily_view_increase: Math.round(r.avg_daily_view_increase ?? 0),
        avg_daily_sub_increase: Math.round(r.avg_daily_sub_increase ?? 0),
        league_group: r.league_group ?? "",
        ageDays: channelAgeDays(r),
        hasPage: Boolean(r.has_page),
    };
}

const sbCategoryOverview = unstable_cache(
    async (): Promise<CategoryOverview> => {
        const categories = CATEGORY_SLUGS.map((s) => CATEGORY_META[s].category);
        const sb = supabase();
        const [stats, top] = await Promise.all([
            sb.from("channel_board_category_stats").select(STATS_COLUMNS).in("main_category", categories),
            sb
                .from("channel_board_category_top")
                .select(TOP_COLUMNS)
                .in("main_category", categories)
                .order("main_category")
                .order("list")
                .order("rk"),
        ]);
        if (stats.error) throw new Error(`Supabase 카테고리 숫자 조회 실패: ${stats.error.message}`);
        if (top.error) throw new Error(`Supabase 카테고리 목록 조회 실패: ${top.error.message}`);
        const statRows = (stats.data ?? []) as unknown as StatsRow[];
        const topRows = (top.data ?? []) as unknown as TopRow[];
        // 비어 있으면 실패로 돌려야 그 결과가 캐시에 남지 않는다.
        if (statRows.length === 0 || topRows.length === 0) {
            throw new Error(`카테고리 보드가 비어 있습니다 (숫자 ${statRows.length}행, 목록 ${topRows.length}행).`);
        }

        const lists = new Map<string, Record<TopRow["list"], CategoryChannel[]>>();
        for (const r of topRows) {
            const l = lists.get(r.main_category) ?? { rising: [], subs: [], new: [] };
            l[r.list]?.push(toChannel(r));
            lists.set(r.main_category, l);
        }
        const statsBy = new Map(statRows.map((r) => [r.main_category, r]));
        const snapshot = (category: string): CategorySnapshot => {
            const st = statsBy.get(category);
            const l = lists.get(category);
            return {
                tracked: st?.tracked ?? 0,
                ranked: st?.ranked ?? 0,
                shorts: st?.shorts ?? 0,
                long: st?.long ?? 0,
                hybrid: st?.hybrid ?? 0,
                newChannels: st?.new_channels ?? 0,
                medianSubscribers: st?.median_subscribers ?? 0,
                top: (l?.rising ?? []).slice(0, TOP_LIMIT),
                topSubs: (l?.subs ?? []).slice(0, SIDE_LIMIT),
                newest: (l?.new ?? []).slice(0, SIDE_LIMIT),
            };
        };
        const byCategory = Object.fromEntries(
            CATEGORY_SLUGS.map((s) => [s, snapshot(CATEGORY_META[s].category)]),
        ) as Record<CategorySlug, CategorySnapshot>;
        const targetDate = statRows.reduce(
            (m, r) => (r.target_date && r.target_date > m ? r.target_date : m),
            "",
        );
        return { targetDate, categories: byCategory };
    },
    ["sb-category-overview-v2"],
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
