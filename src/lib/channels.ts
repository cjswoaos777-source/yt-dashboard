import { unstable_cache } from "next/cache";
import { CHANNELS_URL, getCdnVersion } from "@/lib/cdn";
import { CHANNEL_PAGE_MIN_SUBSCRIBERS } from "@/lib/channel-constants";
import { isSupabase } from "@/lib/datasource";
import { supabase } from "@/lib/supabase";
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

// ─── Supabase 경로 ───────────────────────────────────────────────────────────
//
// GitHub 경로는 함수마다 1.3MB gzip 을 받아 풀고 8,000개를 파싱한 뒤 걸러낸다.
// 여기서는 조건을 쿼리로 넘겨 필요한 행만 받는다. 파이프라인이 매시간
// TRUNCATE + COPY 로 통째로 갈아끼우므로 30분 캐시면 늦어도 한 시간 안에 반영된다.

const SB_REVALIDATE = 1800;

/** 목록 표시에 필요한 컬럼만. sparkline 같은 큰 필드는 받지 않는다. */
const LIST_COLUMNS =
    "channel_id,channel_title,main_category,subscriber_count," +
    "total_view_count,avg_daily_view_increase,tier";

const sbListPage = unstable_cache(
    async (
        page: number,
    ): Promise<{ items: ChannelListItem[]; total: number; totalPages: number }> => {
        const sb = supabase();

        // 기준: 구독자 1만 이상 + 성장이 멈추지 않은 채널. GitHub 경로와 같다.
        // 전체 건수는 head:true 로 행 없이 개수만 받는다.
        const { count, error: cErr } = await sb
            .from("channel_ranking")
            .select("channel_id", { count: "exact", head: true })
            .gte("subscriber_count", CHANNEL_PAGE_MIN_SUBSCRIBERS)
            .gt("avg_daily_view_increase", 0);
        if (cErr) throw new Error(`Supabase 채널 수 조회 실패: ${cErr.message}`);
        const total = count ?? 0;

        const totalPages = Math.max(1, Math.ceil(total / CHANNEL_LIST_PAGE_SIZE));
        const safePage = Math.min(Math.max(1, page), totalPages);
        const start = (safePage - 1) * CHANNEL_LIST_PAGE_SIZE;

        const { data, error } = await sb
            .from("channel_ranking")
            .select(LIST_COLUMNS)
            .gte("subscriber_count", CHANNEL_PAGE_MIN_SUBSCRIBERS)
            .gt("avg_daily_view_increase", 0)
            .order("avg_daily_view_increase", { ascending: false })
            .range(start, start + CHANNEL_LIST_PAGE_SIZE - 1);
        if (error) throw new Error(`Supabase 채널 목록 조회 실패: ${error.message}`);

        return {
            items: ((data ?? []) as unknown as TierChannel[]).map(toListItem),
            total,
            totalPages,
        };
    },
    ["sb-channel-list-v1"],
    { revalidate: SB_REVALIDATE },
);

/** 목록 허브 한 페이지. 출처 스위치에 따라 GitHub 파일 또는 Supabase 를 읽는다. */
export async function getChannelListPage(page: number) {
    if (isSupabase) return sbListPage(page);
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

const sbNewlyTracked = unstable_cache(
    async (): Promise<ChannelListItem[]> => {
        // isAwaitingBaseline() 과 같은 조건을 쿼리로 옮긴 것:
        // is_new_channel 이고 일평균이 0 (= 두 번째 측정 전이라 계산 불가)
        const { data, error } = await supabase()
            .from("channel_ranking")
            .select(LIST_COLUMNS)
            .gte("subscriber_count", CHANNEL_PAGE_MIN_SUBSCRIBERS)
            .eq("is_new_channel", true)
            .eq("avg_daily_view_increase", 0)
            .order("subscriber_count", { ascending: false });
        if (error) throw new Error(`Supabase 신규 채널 조회 실패: ${error.message}`);
        return ((data ?? []) as unknown as TierChannel[]).map(toListItem);
    },
    ["sb-newly-tracked-v1"],
    { revalidate: SB_REVALIDATE },
);

export async function getNewlyTrackedChannels(): Promise<ChannelListItem[]> {
    if (isSupabase) return sbNewlyTracked();
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

    // ── 아카이브 이력 (Supabase 경로에서만 채워진다) ──
    /**
     * 오늘 순위에 있는가. false 면 아래 값들은 '마지막 수집 시점'의 기록이고,
     * 순위(overallRank 등)는 0 이다. 화면은 이 값으로 현재/기록을 구분해 보여준다.
     */
    isCurrent: boolean;
    /** 처음 순위에 오른 날 (YYYY-MM-DD). GitHub 경로는 null */
    firstSeen: string | null;
    /** 마지막으로 순위에 있던 날 */
    lastSeen: string | null;
    /**
     * 총 등장 일수. 색인 정책의 근거다 — 하루만 스쳐간 채널은 데이터가 얇아
     * 구글이 '내용 없는 페이지'로 볼 수 있으므로 noindex 로 둔다.
     */
    daysSeen: number;
}

/** 이 채널 페이지를 색인시켜도 되는 최소 등장 일수 */
export const CHANNEL_INDEX_MIN_DAYS = 3;

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
                // GitHub 파일에는 이력이 없다. 순위 파일에 있으면 곧 '현재'다.
                isCurrent: true,
                firstSeen: null,
                lastSeen: null,
                daysSeen: 0,
            };
        },
        ["channel-detail-v3", channelId, version],
        { revalidate: 3600 },
    )();
}

/**
 * 순위 계산에 필요한 최소 정보.
 *
 * GitHub 경로의 진짜 비용은 여기 있었다 — 채널 1건의 순위를 내려고 8,000개를
 * 통째로 파싱했고, 캐시 키에 channel_id 가 들어 있어 채널마다 그 일을 따로 했다.
 * (실측 124ms/건. 크롤러가 훑을 때 이 비용이 Vercel CPU 를 잠식했다)
 *
 * 순위의 기준이 되는 집합(구독자 1만 이상, 구독자순)은 모든 채널이 같다.
 * 그러니 한 번만 받아 캐시하고 채널마다 공유한다. 세 컬럼뿐이라 868행이어도
 * 수십 KB 다.
 *
 * PostgREST 는 요청당 1,000행이 상한인데 대상이 868개라 한 번에 들어온다.
 * 1,000을 넘기면 range 로 나눠 받아야 한다 — 그때를 대비해 개수를 확인한다.
 */
interface RankRow {
    channel_id: string;
    subscriber_count: number;
    main_category: string;
}

const sbRankContext = unstable_cache(
    async (): Promise<RankRow[]> => {
        const { data, error, count } = await supabase()
            .from("channel_ranking")
            .select("channel_id,subscriber_count,main_category", { count: "exact" })
            .gte("subscriber_count", CHANNEL_PAGE_MIN_SUBSCRIBERS)
            .order("subscriber_count", { ascending: false })
            .range(0, 999);
        if (error) throw new Error(`Supabase 순위 기준 조회 실패: ${error.message}`);
        const rows = (data ?? []) as RankRow[];
        if ((count ?? 0) > rows.length) {
            // 상한에 걸려 잘렸다. 순위가 틀리는 것보다 알아채는 게 낫다.
            console.warn(
                `[channels] 순위 기준 집합이 ${count}개인데 ${rows.length}개만 받았습니다. ` +
                `range 분할이 필요합니다.`,
            );
        }
        return rows;
    },
    ["sb-channel-rank-context-v1"],
    { revalidate: SB_REVALIDATE },
);

/**
 * 채널 상세 — 아카이브 기반.
 *
 * 출처가 두 개다.
 *   channel_archive   한 번 순위에 오른 채널의 영구 기록. 여기 있으면 페이지가 있다.
 *   channel_ranking   오늘 순위. 여기 있으면 '현재'이고 순위·추이를 붙인다.
 *
 * 순위에서 빠진 채널은 아카이브의 마지막 값으로 그리되 isCurrent=false 로 표시해
 * 화면이 "N일 전 기록"임을 밝힌다. 이렇게 해야 URL 이 사라지지 않아 색인이
 * 유지되고, 채널 이름으로 검색해 들어온 사람이 404 대신 정보를 본다.
 */
function sbChannelCached(channelId: string) {
    return unstable_cache(
        async (): Promise<ChannelDetail | null> => {
            const sb = supabase();

            // ① 아카이브 — 페이지 존재 여부는 여기서 정한다.
            const { data: arc, error: aErr } = await sb
                .from("channel_archive")
                .select("*")
                .eq("channel_id", channelId)
                .maybeSingle();
            if (aErr) throw new Error(`Supabase 아카이브 조회 실패: ${aErr.message}`);
            if (!arc) return null;

            // ② 오늘 순위 — 있으면 현재 값과 추이를 쓴다.
            const { data: cur, error: cErr } = await sb
                .from("channel_ranking")
                .select("*")
                .eq("channel_id", channelId)
                .maybeSingle();
            if (cErr) throw new Error(`Supabase 채널 조회 실패: ${cErr.message}`);

            const isCurrent = Boolean(cur);
            // 현재 값이 있으면 그걸, 없으면 아카이브의 마지막 값을 쓴다.
            const channel = (cur ?? arc) as unknown as TierChannel;
            if ((channel.subscriber_count ?? 0) < CHANNEL_PAGE_MIN_SUBSCRIBERS) return null;

            // 순위는 오늘 순위에 있을 때만 의미가 있다.
            let overallRank = 0, overallTotal = 0, categoryRank = 0, categoryTotal = 0;
            let categoryMedianSubscribers = 0;
            if (isCurrent) {
                const ctx = await sbRankContext();
                const sameCategory = ctx.filter((c) => c.main_category === channel.main_category);
                const catSubs = sameCategory.map((c) => c.subscriber_count).sort((a, b) => a - b);
                overallRank = ctx.findIndex((c) => c.channel_id === channelId) + 1;
                overallTotal = ctx.length;
                categoryRank = sameCategory.findIndex((c) => c.channel_id === channelId) + 1;
                categoryTotal = sameCategory.length;
                categoryMedianSubscribers = catSubs.length
                    ? catSubs[Math.floor(catSubs.length / 2)]
                    : 0;
            }

            const a = arc as { first_seen: string; last_seen: string; days_seen: number };
            return {
                channel,
                // 추이는 오늘 순위에 있을 때만 있다 (아카이브엔 sparkline 을 넣지 않는다).
                sparkline: isCurrent ? cleanSparkline(parseSparkline(channel.sparkline_data)) : [],
                overallRank, overallTotal, categoryRank, categoryTotal, categoryMedianSubscribers,
                isCurrent,
                firstSeen: a.first_seen ?? null,
                lastSeen: a.last_seen ?? null,
                daysSeen: a.days_seen ?? 0,
            };
        },
        ["sb-channel-detail-v2", channelId],
        { revalidate: SB_REVALIDATE },
    )();
}

/** 채널 상세. 출처 스위치에 따라 GitHub 파일 또는 Supabase 를 읽는다. */
export async function getChannel(channelId: string): Promise<ChannelDetail | null> {
    if (isSupabase) return sbChannelCached(channelId);
    return getChannelCached(channelId, await getCdnVersion(CHANNELS_URL));
}
