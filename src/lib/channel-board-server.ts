import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import {
    AGE_BANDS, BOARD_LIMIT, BOARD_SORTS, SIZE_BANDS, boardQueryString,
    type BoardChannel, type BoardQuery,
} from "@/lib/channel-board";

/** 지금 뜨는 채널 조회 (서버 전용). 상수·타입은 channel-board.ts 에 있다. */

const BOARD_COLUMNS =
    "channel_id,channel_title,target_date,main_category,league_group,channel_created_at," +
    "subscriber_count,total_view_count,avg_daily_view_increase,avg_daily_sub_increase," +
    "rising_score,damped_score,videos_7d,video_increase,measured_days," +
    "representative_video_id,video_thumbnail,has_page";

/**
 * 조건에 맞는 채널 상위 limit 곳과 전체 개수.
 *
 * 공통 조건
 *   · 일평균을 낼 만큼 숫자가 쌓인 채널만 (is_new_channel = false. 18시 무렵 잰 값이 3일, 실제 2일치 이상)
 *   · 조회수가 늘고 있는 채널만 (예전 벤치마킹의 '성장 중인 채널만'과 같다)
 *   · 바이럴 점수순은 최근 7일 영상 평균이 쇼츠 1만·그 밖 2천 회를 넘은 채널만 (예전 순위와 같은 최소 기준)
 */
export async function fetchBoard(q: BoardQuery, limit = BOARD_LIMIT): Promise<{ rows: BoardChannel[]; total: number }> {
    const sortCol = BOARD_SORTS.find((s) => s.key === q.sort)!.column;
    let req = supabase()
        .from("channel_board")
        .select(BOARD_COLUMNS, { count: "exact" })
        .eq("is_new_channel", false)
        .gt("avg_daily_view_increase", 0);
    if (q.sort === "viral") req = req.eq("passes_min", true);
    if (q.format) req = req.eq("league_group", q.format);
    if (q.category) req = req.eq("main_category", q.category);
    if (q.size) {
        const b = SIZE_BANDS.find((x) => x.key === q.size)!;
        req = req.gte("subscriber_count", b.min);
        if (Number.isFinite(b.max)) req = req.lt("subscriber_count", b.max);
    }
    if (q.age) {
        const days = AGE_BANDS.find((x) => x.key === q.age)!.maxDays;
        req = req.gte("channel_created_at", new Date(Date.now() - days * 86_400_000).toISOString());
    }
    const { data, error, count } = await req
        .order(sortCol, { ascending: false, nullsFirst: false })
        // 정렬 값이 같을 때 순서가 매번 바뀌지 않게 한다
        .order("channel_id")
        .range(0, limit - 1);
    if (error) throw new Error(`Supabase 채널 보드 조회 실패: ${error.message}`);
    return { rows: (data ?? []) as unknown as BoardChannel[], total: count ?? 0 };
}

/**
 * 조합마다 따로 캐시한다. 원본이 하루 한 번(저녁) 바뀌므로 30분이면 늦어도 30분 안에 새 값이 보인다.
 * 조합당 최대 1,000행(약 350KB)이라 Data Cache 항목당 2MB 안에 든다.
 */
export const cachedBoard = (q: BoardQuery) =>
    unstable_cache(
        () => fetchBoard(q),
        ["channel-board-v1", boardQueryString(q)],
        { revalidate: 1800 },
    )();
