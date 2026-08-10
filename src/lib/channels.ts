import { unstable_cache } from "next/cache";
import { CHANNELS_URL, getCdnVersion } from "@/lib/cdn";
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

/**
 * sparkline 을 '실제로 측정된 날'만 남기도록 정제한다.
 *
 * 원본에는 측정값이 아닌 0 이 두 종류 섞여 있어 그대로 그리면 성장 추이를 왜곡한다.
 *  1. 첫날은 비교할 전날이 없어 증가량이 언제나 0 이다(1,114개 채널 전부 확인).
 *     '성장이 0'이 아니라 '계산 불가'이므로 버린다.
 *  2. 조회수·구독자·영상 수가 동시에 0 인 날은 그날 수집이 안 된 것으로 본다.
 *     구독자 1만 이상 채널이 셋 다 정확히 0 일 확률은 사실상 없다
 *     (조회수 0인 날의 86%가 나머지 두 지표도 0이었다).
 *
 * 남은 지점들은 날짜가 연속하지 않을 수 있으므로, 호출부에서 끊긴 구간을 표시해야 한다.
 */
export function cleanSparkline(points: SparklinePoint[]): SparklinePoint[] {
    const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
    // 첫날 제거 (증가량 계산 불가)
    const withoutFirst = sorted.slice(1);
    // 미측정으로 판단되는 날 제거
    return withoutFirst.filter(
        (p) =>
            (p.view_increase ?? 0) !== 0 ||
            (p.sub_increase ?? 0) !== 0 ||
            (p.video_increase ?? 0) !== 0,
    );
}

/** 날짜가 하루씩 연속하는지 (끊긴 구간이 있으면 false) */
export function hasDateGap(points: SparklinePoint[]): boolean {
    for (let i = 1; i < points.length; i++) {
        const prev = new Date(`${points[i - 1].date}T00:00:00Z`).getTime();
        const cur = new Date(`${points[i].date}T00:00:00Z`).getTime();
        if (cur - prev > 86_400_000) return true;
    }
    return false;
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

function toListItem(c: TierChannel): ChannelListItem {
    return {
        channel_id: c.channel_id,
        channel_title: c.channel_title,
        main_category: c.main_category,
        subscriber_count: c.subscriber_count ?? 0,
        total_view_count: c.total_view_count ?? 0,
        avg_daily_view_increase: c.avg_daily_view_increase ?? 0,
        tier: c.tier,
    };
}

/**
 * 추적을 막 시작해 일평균을 아직 계산할 수 없는 채널인지 판정한다.
 *
 * 파이프라인은 측정이 1회뿐이면 증가량을 0으로 채우고 is_new_channel 을 세운다.
 * 이때의 0 은 '성장 없음'이 아니라 '비교할 이전 값이 없어 계산 불가'다.
 * (실측: 8,000개 중 870개가 이 상태이며, 구독자 156만·누적 30억 회 채널도 포함된다.)
 * 두 번째 측정이 쌓이면 자동으로 해소되는 일시적 상태다.
 */
export function isAwaitingBaseline(c: {
    is_new_channel?: boolean;
    avg_daily_view_increase?: number | null;
}): boolean {
    return Boolean(c.is_new_channel) && (c.avg_daily_view_increase ?? 0) === 0;
}

/**
 * 목록 허브용 요약 데이터 (구독자 많은 순).
 * 상세 필드를 다 담으면 캐시가 커지므로 목록 표시에 필요한 것만 추린다.
 */
const getChannelListPageCached = (version: string) => unstable_cache(
    async (
        page: number,
    ): Promise<{ items: ChannelListItem[]; total: number; totalPages: number }> => {
        const all = await fetchAllChannels();
        // 정렬은 일평균 조회수 증가 기준.
        // 이 집합은 '구독자 대비 조회수가 터지는 채널'을 뽑은 것이라 구독자순으로
        // 세우면 집합의 성격과 맞지 않고, 성장지수(damped_score)는 분모가 구독자라
        // 상위가 소형 채널로만 채워져 순위로 읽기 어렵다. 일평균 조회수는 절대량이라
        // 사용자가 바로 이해할 수 있다.
        // 성장이 멈춘 채널은 이 목록의 취지에 맞지 않으므로 제외한다.
        const eligible = all
            .filter(
                (c) =>
                    (c.subscriber_count ?? 0) >= CHANNEL_PAGE_MIN_SUBSCRIBERS &&
                    (c.avg_daily_view_increase ?? 0) > 0,
            )
            .sort(
                (a, b) =>
                    (b.avg_daily_view_increase ?? 0) - (a.avg_daily_view_increase ?? 0),
            );

        const totalPages = Math.max(1, Math.ceil(eligible.length / CHANNEL_LIST_PAGE_SIZE));
        const safePage = Math.min(Math.max(1, page), totalPages);
        const start = (safePage - 1) * CHANNEL_LIST_PAGE_SIZE;

        return {
            items: eligible.slice(start, start + CHANNEL_LIST_PAGE_SIZE).map(toListItem),
            total: eligible.length,
            totalPages,
        };
    },
    // -v4 + version: 가공 로직이 바뀌면 접미사를 올려야 옛 결과가 남지 않는다.
    ["channel-list-page-v4", version],
    { revalidate: 3600 },
);

/** 목록 허브 한 페이지. 원본이 바뀔 때만 다시 계산한다. */
export async function getChannelListPage(page: number) {
    const version = await getCdnVersion(CHANNELS_URL);
    return getChannelListPageCached(version)(page);
}

/**
 * 추적 시작 단계 채널 목록 (구독자 많은 순).
 *
 * 일평균이 0 이라 순위 목록에서는 빠지는데, 상세 페이지와 sitemap 에는 남아 있다.
 * 그대로 두면 사이트 안에서 그 페이지로 갈 경로가 없어 크롤러가 발견하지 못하므로,
 * 허브 하단에 별도 구역으로 노출한다. 순위와 섞으면 계산 불가 값으로 줄을 세우는
 * 셈이 되므로 반드시 분리한다.
 */
const getNewlyTrackedCached = (version: string) => unstable_cache(
    async (): Promise<ChannelListItem[]> => {
        const all = await fetchAllChannels();
        return all
            .filter(
                (c) =>
                    (c.subscriber_count ?? 0) >= CHANNEL_PAGE_MIN_SUBSCRIBERS &&
                    isAwaitingBaseline(c),
            )
            .sort((a, b) => (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0))
            .map(toListItem);
    },
    ["newly-tracked-channels-v1", version],
    { revalidate: 3600 },
)();

export async function getNewlyTrackedChannels(): Promise<ChannelListItem[]> {
    return getNewlyTrackedCached(await getCdnVersion(CHANNELS_URL));
}

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

function getChannelCached(channelId: string, version: string) {
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
                sparkline: cleanSparkline(parseSparkline(channel.sparkline_data)),
                overallRank: eligible.findIndex((c) => c.channel_id === channelId) + 1,
                overallTotal: eligible.length,
                categoryRank: sameCategory.findIndex((c) => c.channel_id === channelId) + 1,
                categoryTotal: sameCategory.length,
                categoryMedianSubscribers,
            };
        },
        ["channel-detail-v3", channelId, version],
        { revalidate: 3600 },
    )();
}

/** 채널 상세. 원본이 바뀔 때만 다시 계산한다. */
export async function getChannel(channelId: string): Promise<ChannelDetail | null> {
    return getChannelCached(channelId, await getCdnVersion(CHANNELS_URL));
}
