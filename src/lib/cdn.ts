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
