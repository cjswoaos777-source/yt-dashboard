import { unstable_cache } from "next/cache";
import { fetchBenchmarkPage, fetchBenchmarkChannels } from "@/lib/supabase";

/**
 * 벤치마킹 페이지용 채널 API.
 *
 * 브라우저 → 이 라우트(캐시) → Supabase. 방문자가 몇 명이든 DB 조회는
 * 캐시가 만료될 때만 일어난다.
 *
 * 응답은 sparkline_data 를 뺀 TierChannel[] 전량(약 6,800행)이다.
 * 벤치마킹 화면이 필터·정렬을 브라우저에서 하므로 전량이 있어야 한다.
 *
 * 캐시는 1,000행 페이지마다 따로 잡는다. 전량을 한 항목에 넣으면 3.2MB 라
 * Vercel Data Cache 의 항목당 2MB 제한에 걸려 캐시가 아예 안 된다.
 * 페이지당 470KB 면 안전하다. 응답은 gzip 되어 나가므로 브라우저는
 * 수백 KB 만 받는다 — GitHub 파일(1.4MB gz)보다 오히려 작다.
 */

export const dynamic = "force-dynamic";

const REVALIDATE_SECONDS = 1800;

const cachedPage = (from: number) =>
    unstable_cache(
        () => fetchBenchmarkPage(from),
        ["api-channels-page-v1", String(from)],
        { revalidate: REVALIDATE_SECONDS },
    )();

export async function GET() {
    try {
        // 페이지 로더로 캐시 버전을 넘긴다. 개수 확인 후 페이지들을 병렬로 받는다.
        const all = await fetchBenchmarkChannels(cachedPage);
        return new Response(JSON.stringify(all), {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "public, max-age=60, s-maxage=1800, stale-while-revalidate=3600",
            },
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }
}
