import { unstable_cache } from "next/cache";

// jsDelivr(cdn.jsdelivr.net/gh/...@main)는 쓰지 않는다.
// 브랜치 URL 을 내부적으로 커밋에 고정해 캐싱하는데, purge API 를 호출해도
// (status: finished 를 반환하지만) 그 매핑이 갱신되지 않아 최대 12시간까지
// 옛 데이터가 서빙된다. 실제로 4시간 넘게 지난 데이터가 노출되는 것을 확인했다.
// 이 데이터는 매시간 갱신되므로 max-age=300 인 raw 를 쓴다.
const BASE =
    "https://raw.githubusercontent.com/cjswoaos777-source/utube-data/main/data";

export const RANKING_URL = `${BASE}/tier0_realtime_ranking.json`;
export const CHANNELS_URL = `${BASE}/dashboard_tier_channels.json.gz`;
/** 태그별 급상승 영상 인덱스 (파이프라인의 sync_tag_index 가 생성) */
export const TAG_INDEX_URL = `${BASE}/tag_index.json.gz`;

export const RANKING_TIER_URLS = {
    all:   `${BASE}/tier0_realtime_ranking_all.json.gz`,
    tier1: `${BASE}/tier0_realtime_ranking_tier1.json.gz`,
    tier2: `${BASE}/tier0_realtime_ranking_tier2.json.gz`,
    tier3: `${BASE}/tier0_realtime_ranking_tier3.json.gz`,
    micro: `${BASE}/tier0_realtime_ranking_micro.json.gz`,
} as const;

export type TierKey = keyof typeof RANKING_TIER_URLS;

// ─── 데이터 버전 감지 ─────────────────────────────────────────────────────────
//
// 원본은 1시간에 한 번만 바뀌는데, 무거운 가공(1.7MB 다운로드 → 압축 해제 →
// 16,000건 정렬)의 캐시를 '시간'으로 잡으면 두 가지를 동시에 잃는다.
//   - 데이터가 그대로인데도 만료될 때마다 전부 다시 함 (시간당 12번 헛수고)
//   - 그러면서도 만료 주기만큼 반영이 늦음
//
// 그래서 가공 결과의 캐시 키를 시각이 아니라 ETag(내용 지문)로 잡는다.
// ETag 확인은 HEAD 요청이라 본문을 0바이트 받으므로, 짧은 주기로 물어봐도 싸다.
// 결과적으로 무거운 가공은 데이터가 실제로 바뀔 때만(=시간당 1번) 일어나고,
// 반영 지연은 아래 확인 주기까지 줄어든다.

/** ETag 확인 주기(초). 이 값이 곧 데이터 반영 지연의 상한이 된다. */
const VERSION_CHECK_SECONDS = 20;

async function headVersion(url: string): Promise<string> {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (!res.ok) throw new Error(`HEAD failed: ${res.status}`);
    // ETag 가 없으면 Last-Modified 로 대체한다.
    return res.headers.get("etag") ?? res.headers.get("last-modified") ?? "";
}

/**
 * 대상 파일의 현재 버전 문자열을 돌려준다.
 *
 * HEAD 요청이 실패해도 페이지가 죽으면 안 되므로 고정 문자열로 폴백한다.
 * 이 경우 가공 결과 캐시는 자체 TTL 이 만료될 때까지 유지된다.
 */
export function getCdnVersion(url: string): Promise<string> {
    return unstable_cache(
        async () => {
            try {
                return await headVersion(url);
            } catch {
                return "unknown";
            }
        },
        ["cdn-version", url],
        { revalidate: VERSION_CHECK_SECONDS },
    )();
}
