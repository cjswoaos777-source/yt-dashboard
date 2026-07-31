// jsDelivr(cdn.jsdelivr.net/gh/...@main)는 쓰지 않는다.
// 브랜치 URL 을 내부적으로 커밋에 고정해 캐싱하는데, purge API 를 호출해도
// (status: finished 를 반환하지만) 그 매핑이 갱신되지 않아 최대 12시간까지
// 옛 데이터가 서빙된다. 실제로 4시간 넘게 지난 데이터가 노출되는 것을 확인했다.
// 이 데이터는 매시간 갱신되므로 max-age=300 인 raw 를 쓴다.
// 매 요청마다 받아오지 않도록 서버 쪽에서 unstable_cache(TTL 300s)로 감싸고 있다.
const BASE =
    "https://raw.githubusercontent.com/cjswoaos777-source/utube-data/main/data";

export const RANKING_URL = `${BASE}/tier0_realtime_ranking.json`;
export const CHANNELS_URL = `${BASE}/dashboard_tier_channels.json.gz`;

export const RANKING_TIER_URLS = {
    all:   `${BASE}/tier0_realtime_ranking_all.json.gz`,
    tier1: `${BASE}/tier0_realtime_ranking_tier1.json.gz`,
    tier2: `${BASE}/tier0_realtime_ranking_tier2.json.gz`,
    tier3: `${BASE}/tier0_realtime_ranking_tier3.json.gz`,
    micro: `${BASE}/tier0_realtime_ranking_micro.json.gz`,
} as const;

export type TierKey = keyof typeof RANKING_TIER_URLS;
