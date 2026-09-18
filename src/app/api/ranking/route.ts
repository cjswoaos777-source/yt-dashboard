import { unstable_cache } from "next/cache";
import { fetchRanking, fetchRankingVersion, rankingCacheSeconds, type TierKey } from "@/lib/supabase";

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
 * 캐시는 tier·origin·lang·limit·offset 조합 + 데이터 버전마다 따로 잡는다.
 *
 * [2026-09-18] 버전(updated_at)을 키에 넣었다. 전에는 30분 고정이라 매시
 * 25분에 바뀌는 데이터와 어긋나 한 시간 넘게 옛 스냅샷이 나가곤 했다.
 * 버전 조회는 1행짜리라 수 ms 이고, 그마저도 앞단 CDN 캐시가 대부분 막는다.
 * revalidate 는 옛 버전 항목을 치우기 위한 상한일 뿐이다.
 */
const REVALIDATE_SECONDS = 3600;

type Origin = "DOMESTIC" | "IMPORTED" | undefined;

const cachedRanking = (version: string, tier: TierKey, origin: Origin, lang: string | undefined, limit: number, offset: number) =>
    unstable_cache(
        () => fetchRanking({ tier, origin, lang, limit, offset }),
        ["api-ranking-v4", version, tier, origin ?? "all", lang ?? "any", String(limit), String(offset)],
        { revalidate: REVALIDATE_SECONDS },
    )();

// 언어 코드는 'en', 'hi', 'zh' 처럼 소문자 2~3자다. 그 밖의 값은 캐시 키만
// 늘리고 결과는 빈 배열이라 받지 않는다.
const LANG_RE = /^[a-z]{2,3}$/;

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

    // 지역 필터. 값이 없거나 이상하면 전체로 둔다.
    const rawOrigin = searchParams.get("origin");
    const origin: Origin =
        rawOrigin === "DOMESTIC" || rawOrigin === "IMPORTED" ? rawOrigin : undefined;

    // 언어 필터. 해외 탭에서만 의미가 있지만 서버는 조합을 제한하지 않는다.
    const rawLang = searchParams.get("lang");
    const lang = rawLang && LANG_RE.test(rawLang) ? rawLang : undefined;

    // 상한을 두지 않으면 한 번에 수만 행을 요청해 응답이 커진다.
    const limit = Math.min(toInt(searchParams.get("limit"), 500), 1000);
    const offset = toInt(searchParams.get("offset"), 0);

    try {
        const { version, syncedAt } = await fetchRankingVersion();
        const rows = await cachedRanking(version, tier, origin, lang, limit, offset);
        // CDN 캐시는 다음 스냅샷이 올 때까지만. 그 뒤엔 짧게 잡아 자주 확인한다.
        // stale-while-revalidate 를 두지 않는 이유: 만료 뒤 옛 응답을 내보내며
        // 뒤에서 갱신하면, 그 옛 응답이 또 한 시간 캐시되는 일이 있었다.
        const sMaxAge = rankingCacheSeconds(syncedAt);
        return new Response(JSON.stringify(rows), {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": `public, max-age=60, s-maxage=${sMaxAge}`,
                "X-Data-Version": version,
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
