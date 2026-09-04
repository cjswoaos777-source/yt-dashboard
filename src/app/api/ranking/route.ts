import { unstable_cache } from "next/cache";
import { fetchRanking, type TierKey } from "@/lib/supabase";

/**
 * 대시보드 랭킹 API.
 *
 * 브라우저 → 이 라우트(캐시) → Supabase 구조의 가운데 층이다.
 * 방문자가 몇 명이든 DB 조회는 캐시가 만료될 때만 일어나므로,
 * 트래픽이 늘어도 DB 부하가 늘지 않는다.
 *
 * 응답 형태는 기존 GitHub JSON 과 같은 ViralVideo[] 라서,
 * 화면 코드는 fetch 주소만 바꾸면 된다. (channel_id, sub_tier 가 추가로 붙지만
 * 기존 화면은 쓰지 않으므로 무시된다)
 */

// 데이터가 매시간 갱신되므로 요청 시점에 캐시 여부를 판단한다.
export const dynamic = "force-dynamic";

const VALID_TIERS: TierKey[] = ["all", "tier1", "tier2", "tier3", "micro"];

/**
 * 캐시는 tier·limit·offset 조합마다 따로 잡는다.
 *
 * 파이프라인이 매시간 갱신하므로 30분이면 늦어도 한 시간 안에는 새 데이터가
 * 반영된다. 정각 직후 요청이 옛 데이터를 받는 구간이 최대 30분 생기지만,
 * 급상승 지표라 그 정도 지연은 화면에서 문제가 되지 않는다.
 * (더 정확히 맞추려면 updated_at 을 캐시 키에 넣어야 하는데, 그러면 확인용
 *  조회가 매번 발생해 캐시의 이점이 줄어든다)
 */
const REVALIDATE_SECONDS = 1800;

const cachedRanking = (tier: TierKey, limit: number, offset: number) =>
    unstable_cache(
        () => fetchRanking({ tier, limit, offset }),
        ["api-ranking-v1", tier, String(limit), String(offset)],
        { revalidate: REVALIDATE_SECONDS },
    )();

function toInt(v: string | null, fallback: number): number {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const rawTier = searchParams.get("tier") ?? "all";
    const tier = (VALID_TIERS as string[]).includes(rawTier)
        ? (rawTier as TierKey)
        : "all";

    // 상한을 두지 않으면 한 번에 수만 행을 요청해 응답이 커진다.
    const limit = Math.min(toInt(searchParams.get("limit"), 500), 1000);
    const offset = toInt(searchParams.get("offset"), 0);

    try {
        const rows = await cachedRanking(tier, limit, offset);
        return new Response(JSON.stringify(rows), {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                // 브라우저는 짧게, Vercel 엣지는 길게 잡는다.
                "Cache-Control": "public, max-age=60, s-maxage=1800, stale-while-revalidate=3600",
            },
        });
    } catch (e) {
        // 화면이 빈 배열을 받으면 "데이터 없음"으로 오해할 수 있으므로
        // 실패는 명시적으로 500 으로 알린다. 호출부가 에러 메시지를 띄운다.
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }
}
