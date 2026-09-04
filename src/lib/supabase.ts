import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ViralVideo } from "@/lib/viral-types";

/**
 * Supabase 읽기 계층.
 *
 * 이 파일은 서버(API Route)에서만 쓴다. 브라우저는 여기를 거치지 않고
 * /api/* 를 부른다 — 이유는 datasource.ts 주석 참조.
 *
 * 쓰기는 파이프라인(utube_rank/sync_supabase.py)이 매시간 TRUNCATE + COPY 로
 * 통째로 갈아끼운다. 프론트는 읽기만 하며, anon 키는 RLS 로 SELECT 만 허용된다.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

/** 클라이언트를 만들어 재사용한다. 환경변수가 없으면 명확히 실패시킨다. */
export function supabase(): SupabaseClient {
    if (!URL || !ANON) {
        throw new Error(
            "Supabase 환경변수가 없습니다. " +
            "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 를 확인하세요.",
        );
    }
    if (!_client) {
        _client = createClient(URL, ANON, {
            auth: { persistSession: false },
        });
    }
    return _client;
}

/** 대시보드가 쓰는 구독자 구간 키. GitHub 파일 분할과 이름을 맞춘다. */
export type TierKey = "all" | "tier1" | "tier2" | "tier3" | "micro";

/**
 * PostgREST 한 번에 가져올 수 있는 최대 행 수.
 *
 * Supabase 기본 상한이 1,000행이라 그 이상은 range 로 나눠 받아야 한다.
 * 대시보드는 화면에 수백 개를 넘게 뿌리지 않으므로 여기서 상한을 두고,
 * 더 깊이 보는 것은 페이지네이션으로 푼다(5단계 이후).
 */
const MAX_ROWS = 1000;

/** ViralVideo 로 그대로 매핑되도록 컬럼을 고정한다. 순서가 아니라 이름으로 받는다. */
const VIDEO_COLUMNS =
    "video_id,title,channel_title,channel_id,video_type,origin_type," +
    "category_name,sub_tier,total_views,total_likes,total_comments," +
    "hourly_view_increase,hourly_like_increase,hourly_comment_increase,updated_at";

export interface RankingRow extends ViralVideo {
    /** GitHub JSON 에는 없던 값. 영상 카드에서 채널 페이지로 이동할 때 쓴다. */
    channel_id: string | null;
    sub_tier: string;
}

/**
 * 급상승 랭킹.
 *
 * GitHub 파일은 조합별 상위 50위만 담고 있어 전체의 12% 만 나갔다.
 * 여기서는 컷 없이 정렬해 원하는 만큼 잘라 쓴다.
 */
export async function fetchRanking(opts: {
    tier?: TierKey;
    limit?: number;
    offset?: number;
}): Promise<RankingRow[]> {
    const tier = opts.tier ?? "all";
    const limit = Math.min(opts.limit ?? 500, MAX_ROWS);
    const offset = Math.max(opts.offset ?? 0, 0);

    let q = supabase()
        .from("video_ranking")
        .select(VIDEO_COLUMNS)
        .order("hourly_view_increase", { ascending: false })
        .range(offset, offset + limit - 1);

    // 'all' 은 구간 구분 없이 전체. 나머지는 sub_tier 로 좁힌다.
    if (tier !== "all") q = q.eq("sub_tier", tier);

    const { data, error } = await q;
    if (error) throw new Error(`Supabase ranking 조회 실패: ${error.message}`);
    return (data ?? []) as unknown as RankingRow[];
}

/** 이 스냅샷이 몇 시 기준인지. 화면에 "N시 기준"으로 표시된다. */
export async function fetchUpdatedAt(): Promise<string | null> {
    const { data, error } = await supabase()
        .from("video_ranking")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1);
    if (error) throw new Error(`Supabase updated_at 조회 실패: ${error.message}`);
    return data?.[0]?.updated_at ?? null;
}
