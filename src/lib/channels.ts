import { unstable_cache } from "next/cache";
import { CHANNELS_URL } from "@/lib/cdn";
import { CHANNEL_PAGE_MIN_SUBSCRIBERS } from "@/lib/channel-constants";
import type { TierChannel, SparklinePoint } from "@/lib/tier-channel-types";

export { CHANNEL_PAGE_MIN_SUBSCRIBERS };

/**
 * sparkline_data 정규화.
 *
 * 파이프라인 수정 이후에는 배열로 내려오지만, 수정 전 데이터는
 * 파이썬 표기 문자열("[{'date': ...}]")이라 JSON.parse 가 실패한다.
 * 두 형태를 모두 받아 배열로 반환하고, 어느 쪽도 아니면 빈 배열을 준다.
 */
export function parseSparkline(
    raw: TierChannel["sparkline_data"],
): SparklinePoint[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== "string") return [];

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // 파이썬 표기 문자열 폴백: 작은따옴표를 큰따옴표로, True/False/None 을 JSON 리터럴로.
        // 채널명 같은 자유 텍스트가 없는 순수 숫자/날짜 구조라서 이 치환이 안전하다.
        try {
            const normalized = raw
                .replace(/'/g, '"')
                .replace(/\bTrue\b/g, "true")
                .replace(/\bFalse\b/g, "false")
                .replace(/\bNone\b/g, "null");
            const parsed = JSON.parse(normalized);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
}

async function fetchAllChannels(): Promise<TierChannel[]> {
    const res = await fetch(CHANNELS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`CDN fetch failed: ${res.status} ${res.statusText}`);

    // jsDelivr가 Content-Encoding:gzip 자동 적용 → 이미 decode된 경우 .json() 직접 사용
    // Content-Type이 application/gzip인 경우 수동 디코딩
    let raw: unknown;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("gzip") || contentType.includes("octet-stream")) {
        const { promisify } = await import("util");
        const { gunzip } = await import("zlib");
        const gunzipAsync = promisify(gunzip);
        const buf = Buffer.from(await res.arrayBuffer());
        const decompressed = await gunzipAsync(buf);
        raw = JSON.parse(decompressed.toString("utf-8"));
    } else {
        raw = await res.json();
    }

    return Array.isArray(raw) ? (raw as TierChannel[]) : [];
}

/**
 * 상세 페이지 생성 대상 채널의 id 목록 (구독자 많은 순).
 * 원본 1.4MB 를 매번 파싱하지 않도록 id 만 추려 캐싱한다.
 */
export const getIndexableChannelIds = unstable_cache(
    async (): Promise<string[]> => {
        const all = await fetchAllChannels();
        return all
            .filter((c) => (c.subscriber_count ?? 0) >= CHANNEL_PAGE_MIN_SUBSCRIBERS)
            .sort((a, b) => (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0))
            .map((c) => c.channel_id);
    },
    ["indexable-channel-ids-v2"],
    { revalidate: 3600 },
);

/** 목록 허브 페이지의 한 페이지 크기 */
export const CHANNEL_LIST_PAGE_SIZE = 100;

export interface ChannelListItem {
    channel_id: string;
    channel_title: string;
    main_category: string;
    subscriber_count: number;
    total_view_count: number;
    avg_daily_view_increase: number;
    tier: number;
}

/**
 * 목록 허브용 요약 데이터 (구독자 많은 순).
 * 상세 필드를 다 담으면 캐시가 커지므로 목록 표시에 필요한 것만 추린다.
 */
export const getChannelListPage = unstable_cache(
    async (
        page: number,
    ): Promise<{ items: ChannelListItem[]; total: number; totalPages: number }> => {
        const all = await fetchAllChannels();
        const eligible = all
            .filter((c) => (c.subscriber_count ?? 0) >= CHANNEL_PAGE_MIN_SUBSCRIBERS)
            .sort((a, b) => (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0));

        const totalPages = Math.max(1, Math.ceil(eligible.length / CHANNEL_LIST_PAGE_SIZE));
        const safePage = Math.min(Math.max(1, page), totalPages);
        const start = (safePage - 1) * CHANNEL_LIST_PAGE_SIZE;

        return {
            items: eligible.slice(start, start + CHANNEL_LIST_PAGE_SIZE).map((c) => ({
                channel_id: c.channel_id,
                channel_title: c.channel_title,
                main_category: c.main_category,
                subscriber_count: c.subscriber_count ?? 0,
                total_view_count: c.total_view_count ?? 0,
                avg_daily_view_increase: c.avg_daily_view_increase ?? 0,
                tier: c.tier,
            })),
            total: eligible.length,
            totalPages,
        };
    },
    ["channel-list-page-v2"],
    { revalidate: 3600 },
);

/**
 * 단일 채널 조회.
 *
 * 캐시 키에 channel_id 를 포함시켜야 채널별로 따로 캐싱되므로, unstable_cache 를
 * 채널 id 마다 생성한다. 반환값은 채널 1건이라 캐시 용량 걱정이 없다.
 * 대상 기준(구독자 1만)에 못 미치면 null 을 반환해 호출부에서 404 처리한다.
 */
export interface ChannelDetail {
    channel: TierChannel;
    sparkline: SparklinePoint[];
    /** 상세 페이지 대상 채널 전체에서의 구독자 순위 */
    overallRank: number;
    overallTotal: number;
    /** 같은 카테고리 내에서의 구독자 순위 */
    categoryRank: number;
    categoryTotal: number;
    /** 같은 카테고리 채널들의 구독자 중위값 — 비교 문장 생성용 */
    categoryMedianSubscribers: number;
}

export function getChannel(channelId: string) {
    return unstable_cache(
        async (): Promise<ChannelDetail | null> => {
            const all = await fetchAllChannels();
            const channel = all.find((c) => c.channel_id === channelId);
            if (!channel) return null;
            if ((channel.subscriber_count ?? 0) < CHANNEL_PAGE_MIN_SUBSCRIBERS) return null;

            const bySubsDesc = (a: TierChannel, b: TierChannel) =>
                (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0);

            const eligible = all
                .filter((c) => (c.subscriber_count ?? 0) >= CHANNEL_PAGE_MIN_SUBSCRIBERS)
                .sort(bySubsDesc);

            const sameCategory = eligible
                .filter((c) => c.main_category === channel.main_category)
                .sort(bySubsDesc);

            const catSubs = sameCategory
                .map((c) => c.subscriber_count ?? 0)
                .sort((a, b) => a - b);
            const categoryMedianSubscribers = catSubs.length
                ? catSubs[Math.floor(catSubs.length / 2)]
                : 0;

            return {
                channel,
                sparkline: parseSparkline(channel.sparkline_data),
                overallRank: eligible.findIndex((c) => c.channel_id === channelId) + 1,
                overallTotal: eligible.length,
                categoryRank: sameCategory.findIndex((c) => c.channel_id === channelId) + 1,
                categoryTotal: sameCategory.length,
                categoryMedianSubscribers,
            };
        },
        ["channel-detail-v2", channelId],
        { revalidate: 3600 },
    )();
}
