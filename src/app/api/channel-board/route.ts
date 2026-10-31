import { parseBoardQuery } from "@/lib/channel-board";
import { cachedBoard } from "@/lib/channel-board-server";

/**
 * 지금 뜨는 채널 API (2026-10-31). 브라우저 → 이 라우트 → (캐시) → Supabase channel_board.
 * 필터 조합마다 캐시한다 (channel-board-server.ts 의 cachedBoard).
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const q = parseBoardQuery(new URL(req.url).searchParams);
        const result = await cachedBoard(q);
        return new Response(JSON.stringify(result), {
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
