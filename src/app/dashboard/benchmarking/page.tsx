import { permanentRedirect } from "next/navigation";
import { boardQueryString, parseBoardQuery } from "@/lib/channel-board";

/*
 * [2026-10-31] 벤치마킹은 '지금 뜨는 채널'(/channel)로 합쳤다 (사용자 결정: 지금 뜨는 영상 옆에, 이름은
 * '지금 뜨는 채널'). 같은 필터가 그 화면에 있으므로, 예전 주소에 붙은 필터는 새 이름으로 옮겨 보낸다.
 *   sort    damped_score → viral, avg_daily_view_increase → views, avg_daily_sub_increase → subs
 *           (없으면 새 기본값인 떠오르는 순)
 *   league  SHORTS·LONG·HYBRID → format
 *   size    lt1k·1k·10k 그대로, 100k(예전 '10만 이상') → 100k(10만~100만)
 *   region  해외 채널을 싣지 않으므로 버린다
 */
const SORT: Record<string, string> = {
    damped_score: "viral",
    avg_daily_view_increase: "views",
    avg_daily_sub_increase: "subs",
};

export default async function BenchmarkingRedirect({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const sp = await searchParams;
    const one = (k: string) => {
        const v = sp[k];
        return (Array.isArray(v) ? v[0] : v) ?? undefined;
    };
    const mapped = new URLSearchParams();
    const sort = one("sort");
    if (sort && SORT[sort]) mapped.set("sort", SORT[sort]);
    const league = one("league");
    if (league) mapped.set("format", league);
    for (const k of ["category", "size", "age"]) {
        const v = one(k);
        if (v) mapped.set(k, v);
    }
    const qs = boardQueryString(parseBoardQuery(mapped));
    permanentRedirect(qs ? `/channel?${qs}` : "/channel");
}
