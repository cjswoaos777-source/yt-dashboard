/**
 * 지금 뜨는 채널 (2026-10-31, 사용자 결정).
 *
 * 원본은 Supabase channel_board 다. utube_rank/channel_board_sync.py 가 하루 한 번 통째로 바꾼다
 * (계산은 BigQuery sp_build_channel_board).
 *   · 대상: 최근 7일 안에 수집된 국내 채널 전부 (10-31 기준 24,030곳).
 *     예전 순위(channel_ranking)는 바이럴 점수로 네 리그 × 2,000곳을 미리 고른 뒤 그 안에서만 줄을 세웠다.
 *   · 국내: 채널의 최근 30일 수집 영상 중 국내(한국어) 영상이 절반 이상.
 *   · 해외 채널은 싣지 않는다 (사용자 결정 '해외는 빼고 국내 중심').
 *
 * 화면이 필터를 바꿀 때마다 조합별로 상위 1,000곳을 받는다. 2만 곳을 통째로 브라우저에 보내면
 * 10MB 가 넘어 Vercel 응답 한도(4.5MB)에 걸린다. 영상 순위(/api/ranking)와 같은 방식이다.
 *
 * 이 파일은 브라우저에서도 쓴다(상수·타입). 조회는 channel-board-server.ts 에 있다.
 */

export type BoardSort = "rising" | "views" | "subs" | "viral";
export type BoardFormat = "SHORTS" | "LONG" | "HYBRID";

export const BOARD_SORTS: { key: BoardSort; column: string; label: string }[] = [
    // 기본값. 구독자에 비해 하루 조회수가 얼마나 느는가 (일평균 조회수 증가 ÷ (구독자 + 1만)).
    { key: "rising", column: "rising_score", label: "🚀 떠오르는 순" },
    { key: "views", column: "avg_daily_view_increase", label: "📈 조회수 증가순" },
    { key: "subs", column: "avg_daily_sub_increase", label: "👥 구독자 증가순" },
    { key: "viral", column: "damped_score", label: "🔥 바이럴 점수순" },
];

export const BOARD_FORMATS: { key: BoardFormat; label: string }[] = [
    { key: "SHORTS", label: "📱 쇼츠" },
    { key: "LONG", label: "📺 롱폼" },
    { key: "HYBRID", label: "🎬 쇼츠+롱폼" },
];

/**
 * 구독자 구간. 예전 벤치마킹은 10만 이상을 한 칸으로 뒀다(선별된 8,000곳 중 14곳뿐이라).
 * 전체 국내 채널에는 10만~100만이 2,700곳, 100만 이상이 480곳 있어 둘로 나눈다 (10-31).
 */
export const SIZE_BANDS = [
    { key: "lt1k", label: "1천 미만", min: 0, max: 1_000 },
    { key: "1k", label: "1천~1만", min: 1_000, max: 10_000 },
    { key: "10k", label: "1만~10만", min: 10_000, max: 100_000 },
    { key: "100k", label: "10만~100만", min: 100_000, max: 1_000_000 },
    { key: "1m", label: "100만 이상", min: 1_000_000, max: Infinity },
] as const;
export type SizeKey = (typeof SIZE_BANDS)[number]["key"];

/** 채널 나이. 개설일은 유튜브에 표시된 채널 개설일이다. */
export const AGE_BANDS = [
    { key: "90d", label: "✨ 3개월 이내", maxDays: 90 },
    { key: "1y", label: "1년 이내", maxDays: 365 },
] as const;
export type AgeKey = (typeof AGE_BANDS)[number]["key"];

/**
 * 카테고리 칩 순서 (10-31 국내 채널 수 순). 값은 main_category(유튜브 카테고리 영문 이름)다.
 * Overall(영상이 없어 분류를 못 한 채널)은 칩으로 두지 않는다. '전체'에서만 보인다.
 */
export const BOARD_CATEGORIES = [
    "People & Blogs", "Entertainment", "Gaming", "Sports", "Howto & Style", "Film & Animation",
    "News & Politics", "Education", "Music", "Travel & Events", "Comedy", "Pets & Animals",
    "Autos & Vehicles", "Science & Technology", "Nonprofits & Activism",
] as const;

export interface BoardQuery {
    sort: BoardSort;
    format: BoardFormat | null;
    category: string | null;
    size: SizeKey | null;
    age: AgeKey | null;
}

export const DEFAULT_BOARD_QUERY: BoardQuery = { sort: "rising", format: null, category: null, size: null, age: null };

/**
 * 자주 쓰는 조합을 한 번에 고르는 '바로 보기'.
 * 필터를 하나씩 눌러야 찾을 수 있던 것을 첫 화면에서 바로 보이게 한다.
 */
export const BOARD_PRESETS: { key: string; label: string; query: Partial<BoardQuery> }[] = [
    { key: "new", label: "🌱 새로 생긴 채널", query: { age: "90d" } },
    { key: "shorts", label: "📱 쇼츠 채널", query: { format: "SHORTS" } },
    { key: "long", label: "📺 롱폼 채널", query: { format: "LONG" } },
    { key: "mid", label: "🎯 구독자 1만~10만", query: { size: "10k" } },
    { key: "big", label: "🏆 구독자 100만+ 조회수 증가", query: { size: "1m", sort: "views" } },
];

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function get(p: Params, k: string): string | null {
    if (p instanceof URLSearchParams) return p.get(k);
    const v = p[k];
    return (Array.isArray(v) ? v[0] : v) ?? null;
}

/** 주소의 값을 검사해서 읽는다. 모르는 값은 기본값으로 본다. */
export function parseBoardQuery(p: Params): BoardQuery {
    const sort = get(p, "sort");
    const format = get(p, "format");
    const category = get(p, "category");
    const size = get(p, "size");
    const age = get(p, "age");
    return {
        sort: BOARD_SORTS.some((s) => s.key === sort) ? (sort as BoardSort) : "rising",
        format: BOARD_FORMATS.some((f) => f.key === format) ? (format as BoardFormat) : null,
        category: category && (BOARD_CATEGORIES as readonly string[]).includes(category) ? category : null,
        size: SIZE_BANDS.some((b) => b.key === size) ? (size as SizeKey) : null,
        age: AGE_BANDS.some((b) => b.key === age) ? (age as AgeKey) : null,
    };
}

/** 기본값이 아닌 것만 담은 주소 꼬리 (앞의 ? 없음). 순서가 늘 같아 캐시 키로도 쓴다. */
export function boardQueryString(q: BoardQuery): string {
    const p = new URLSearchParams();
    if (q.sort !== "rising") p.set("sort", q.sort);
    if (q.format) p.set("format", q.format);
    if (q.category) p.set("category", q.category);
    if (q.size) p.set("size", q.size);
    if (q.age) p.set("age", q.age);
    return p.toString();
}

export function isDefaultBoardQuery(q: BoardQuery): boolean {
    return boardQueryString(q) === "";
}

/** 조합마다 받아 오는 최대 개수 (PostgREST 한 번 상한과 같다) */
export const BOARD_LIMIT = 1000;

export interface BoardChannel {
    channel_id: string;
    channel_title: string;
    target_date: string;
    main_category: string | null;
    league_group: BoardFormat | null;
    channel_created_at: string | null;
    subscriber_count: number;
    total_view_count: number;
    avg_daily_view_increase: number;
    avg_daily_sub_increase: number;
    rising_score: number;
    damped_score: number | null;
    videos_7d: number;
    video_increase: number | null;
    measured_days: number | null;
    representative_video_id: string | null;
    video_thumbnail: string | null;
    has_page: boolean;
}

/** 정렬 기준에 맞는 큰 숫자 하나 (목록 오른쪽) */
export function boardMetric(c: BoardChannel, sort: BoardSort): { label: string; value: number; unit: string } {
    switch (sort) {
        case "subs":
            return { label: "하루 구독자", value: c.avg_daily_sub_increase, unit: "명" };
        case "viral":
            return { label: "바이럴 점수", value: c.damped_score ?? 0, unit: "" };
        default:
            return { label: "하루 조회수", value: c.avg_daily_view_increase, unit: "회" };
    }
}
