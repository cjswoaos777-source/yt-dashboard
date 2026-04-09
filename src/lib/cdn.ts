// 캐시 퍼지는 youtube-trend-bot 레포
// .github/workflows/purge-cache.yml 에서 자동 처리
const BASE =
    "https://cdn.jsdelivr.net/gh/cjswoaos777-source/utube-data@main/data";

export const RANKING_URL = `${BASE}/tier0_realtime_ranking.json`;
export const CHANNELS_URL = `${BASE}/dashboard_tier_channels.json.gz`;
