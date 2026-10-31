import { unstable_cache } from "next/cache";
import { CHANNELS_URL, getCdnVersion } from "@/lib/cdn";
import { CHANNEL_PAGE_MIN_SUBSCRIBERS } from "@/lib/channel-constants";
import { isSupabase } from "@/lib/datasource";
import { supabase } from "@/lib/supabase";
import type { TierChannel, SparklinePoint } from "@/lib/tier-channel-types";
import type { ChannelInsight } from "@/lib/channel-insight";

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

// ─── Supabase 경로 ───────────────────────────────────────────────────────────
//
// [2026-10-31] 목록 허브(구독자 1만+ 채널을 일평균 조회수 순으로 100곳씩)는 '지금 뜨는 채널'
// 필터 보드(channel-board-server.ts)로 바뀌어 여기서 지웠다. 남은 것은 채널 상세다.

/** 보드·아카이브는 하루 한 번(저녁) 바뀐다. 30분 캐시면 늦어도 한 시간 안에 반영된다. */
const SB_REVALIDATE = 1800;

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
    /** 보드(최근 7일 안에 수집된 국내 채널 전부)에서의 구독자 순위 */
    overallRank: number;
    overallTotal: number;
    /** 같은 카테고리 내에서의 구독자 순위 */
    categoryRank: number;
    categoryTotal: number;
    /** 같은 카테고리 채널들의 구독자 중위값 — 비교 문장 생성용 */
    categoryMedianSubscribers: number;
    /** 떠오르는 순 순위 (/channel 첫 화면과 같은 순서). 순위에 들지 않으면 0 */
    risingRank: number;
    risingTotal: number;

    // ── 아카이브 이력 (Supabase 경로에서만 채워진다) ──
    /**
     * 오늘 '지금 뜨는 채널' 보드에 있는가. false 면 아래 값들은 '마지막 수집 시점'의 기록이고,
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
    /**
     * 다음·빙·네이버에 내보내는 채널인가 (channel_archive.search_open, 2026-10-31).
     * 보드로 바꾸며 페이지가 크게 늘어 노출 목록을 따로 둔다 (isIndexableChannel 주석).
     */
    searchOpen: boolean;
    /** 같은 카테고리·비슷한 규모의 채널 (내부 링크용). GitHub 경로는 없음 */
    related?: RelatedChannel[];
    /** 최근 30일 포착 영상·구독자 변화 (channel_recent). 없으면 null */
    recent?: ChannelRecent | null;
    /** 주제 태그·업로드 요일·영상 길이 (channel_extra). SEO 실험군에만 표시 (seo-experiment.ts) */
    extra?: ChannelExtra | null;
}

/** 채널 고유 정보 (channel_extra, utube_rank/seo_channel_extra.py 가 매일 채움) */
export interface ChannelExtra {
    topics: { t: string; n: number }[];
    /** 월~일 업로드 수 */
    weekday: number[];
    long_n: number;
    long_avg_sec: number | null;
    short_n: number;
    short_avg_sec: number | null;
}

/** 최근 30일 포착 영상 한 줄 (channel_recent.videos 원소) */
export interface RecentVideo {
    id: string;
    /** 제목 */
    t: string;
    /** 게시일 YYYY-MM-DD */
    d: string;
    /** 숏츠 여부 */
    s: boolean;
    /** 수집 시점 조회수 */
    v: number;
}

/**
 * 채널별 최근 30일 기록. 파이프라인이 매일 통째로 다시 만든다 (sync_supabase.refresh_channel_recent).
 *
 * [2026-10-12] 채널 페이지가 같은 틀에 숫자만 달라 '크롤링됨 - 색인 안 함'이 768개로 뛰었다.
 * 영상 제목은 그 채널에만 있는 문장이라 페이지마다 내용이 달라진다.
 */
export interface ChannelRecent {
    videos: RecentVideo[];
    videos_30d: number;
    shorts_30d: number;
    subs_from: number | null;
    subs_from_date: string | null;
    subs_to: number | null;
    subs_to_date: string | null;
    /** 사이트맵 채널만 있다 (channel-insight.ts) */
    insight?: ChannelInsight | null;
}

/** 이 채널 페이지를 색인시켜도 되는 최소 등장 일수 */
export const CHANNEL_INDEX_MIN_DAYS = 3;

/**
 * 순위에서 빠진 뒤 이 일수가 지나면 noindex.
 *
 * [2026-10-12] 정책상(III.E.4.d) 30일 지난 채널은 refresh_archive 가 일평균·성장 지수를
 * 지운다(ARCHIVE_STALE_DAYS). 그러면 페이지에 구독자·누적 조회수만 남아 같은 틀의
 * 얇은 페이지가 된다. 10월 초 이런 페이지가 쌓이자 서치콘솔 '크롤링됨 - 현재 색인이
 * 생성되지 않음'이 ~200 → 768 로 뛰고 색인 수가 줄었다. 사이트 전체 품질 평가를
 * 끌어내리지 않도록 색인 대상에서 뺀다. 다시 순위에 오르면 자동으로 색인 대상이 된다.
 */
export const CHANNEL_INDEX_MAX_STALE_DAYS = 30;

/** 한국 날짜(YYYY-MM-DD) 기준 오늘부터 며칠 전인가 */
export function daysSinceKst(date: string | null): number | null {
    if (!date) return null;
    return Math.max(0, Math.round((Date.now() - new Date(`${date}T00:00:00+09:00`).getTime()) / 86_400_000));
}

/** 오늘 기준 N일 전의 한국 날짜 (YYYY-MM-DD) */
export function kstDateDaysAgo(days: number): string {
    return new Date(Date.now() + 9 * 3_600_000 - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * 순위에 있거나 빠진 지 30일 이내인가.
 *
 * [2026-10-29] 사이트맵과 같은 한국 날짜 비교로 세고 하루 여유를 준다.
 * 전에는 반올림 일수(daysSinceKst)로 세서 30일째 날 정오에 noindex 로 바뀌었고,
 * 사이트맵(그날 자정까지 실음)과 어긋나 '제출했는데 noindex' 가 하루 11~22개씩 생겼다.
 */
function isFreshChannel(d: Pick<ChannelDetail, "isCurrent" | "lastSeen">): boolean {
    if (d.isCurrent) return true;
    return !!d.lastSeen && d.lastSeen >= kstDateDaysAgo(CHANNEL_INDEX_MAX_STALE_DAYS + 1);
}

/**
 * 30일 넘은 기록 채널을 다음·빙·네이버에 계속 보여 줄 기준 (2026-10-29, 1단계).
 *
 * 다음 검색 유입의 86%가 이미 순위에서 빠진 채널 페이지로 들어왔다(채널 이름 검색).
 * 30일이 지나도 수집기가 새 영상을 계속 잡는 채널은 '최근 30일 포착 영상'과 채널 분석이
 * 살아 있어 얇은 페이지가 아니다. 순위 7일 이상 + 최근 30일 영상 5개 이상(약 610개)부터 열고,
 * 다음 유입과 색인 반응을 본 뒤 2단계(3일·3개, 약 1,549개)를 판단한다.
 * 구글에는 열지 않는다(isGoogleIndexableChannel).
 */
export const ARCHIVE_INDEX_MIN_DAYS = 7;
export const ARCHIVE_INDEX_MIN_RECENT_VIDEOS = 5;

/**
 * 채널 상세를 색인시킬지 (meta robots — 다음·빙·네이버). 얇은 페이지(짧게 스쳐간 채널, 오래된 기록)는 뺀다.
 *
 * [2026-10-12] 해외 채널(IMPORTED)도 뺀다. 한국어 사이트에 외국 소형 채널 페이지가
 * 섞여 있으면 사이트 평가를 끌어내린다. '색인 안 함' 목록에서 해외 채널 비중(23%)이
 * 사이트맵 안 비중(16%)보다 높았다. 페이지는 그대로 열리고 검색에만 안 나온다.
 *
 * [2026-10-31] 노출 목록(searchOpen)을 먼저 본다. '지금 순위에 있음'이 8,000곳 선별에서
 * 7일 수집 국내 채널 전체(보드)로 넓어지고 페이지도 4천여 곳에서 1만 5천 곳으로 늘어, 아래 기준만
 * 두면 색인 대상이 한 번에 몇 배가 된다. 배포하는 날 기존 기준의 결과를 목록에 한 번 고정했고
 * (utube_rank/sql/steps/21), 그 뒤로는 묶음으로만 연다(SEO 운영안: 노출은 한 번에 늘리지 않는다).
 * 목록 안의 채널도 아래 기준(얇은 페이지·오래된 기록)을 계속 지켜야 한다.
 */
export function isIndexableChannel(
    d: Pick<ChannelDetail, "isCurrent" | "daysSeen" | "lastSeen" | "recent" | "searchOpen"> & { channel: Pick<TierChannel, "origin_type"> },
): boolean {
    if (!d.searchOpen) return false;
    if (d.channel.origin_type !== "DOMESTIC") return false;
    if (d.daysSeen < CHANNEL_INDEX_MIN_DAYS) return false;
    if (isFreshChannel(d)) return true;
    return d.daysSeen >= ARCHIVE_INDEX_MIN_DAYS && (d.recent?.videos_30d ?? 0) >= ARCHIVE_INDEX_MIN_RECENT_VIDEOS;
}

/**
 * 구글에만 적용하는 기준.
 *
 * [2026-10-21] 14일 이상 채널(약 1,260개)만 구글에 보여 줬다.
 * [2026-10-29] 구글 '2026년 9월 스팸 업데이트'(09-24~10-08)에 사이트가 걸렸다(10-05~07 노출 0).
 * 같은 틀의 채널 페이지 수천 개가 '확장된 콘텐츠 악용'으로 보였을 가능성이 크다.
 * 회복될 때까지 채널 상세는 구글에 전부 내보내지 않는다(meta name="googlebot" noindex).
 * 핵심 페이지가 다시 색인되면 GOOGLE_CHANNEL_INDEX_ENABLED 를 켜고, 가장 알찬 채널부터
 * 50개 → 100개씩 늘린다(SEO 운영안 10-29).
 */
export const GOOGLE_CHANNEL_INDEX_ENABLED = false;
export const GOOGLE_CHANNEL_MIN_DAYS = 14;

export function isGoogleIndexableChannel(
    d: Parameters<typeof isIndexableChannel>[0],
): boolean {
    if (!GOOGLE_CHANNEL_INDEX_ENABLED) return false;
    return isFreshChannel(d) && isIndexableChannel(d) && d.daysSeen >= GOOGLE_CHANNEL_MIN_DAYS;
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
                risingRank: 0,
                risingTotal: 0,
                // GitHub 파일에는 이력이 없다. 순위 파일에 있으면 곧 '현재'다.
                isCurrent: true,
                firstSeen: null,
                lastSeen: null,
                daysSeen: 0,
                searchOpen: false,
            };
        },
        ["channel-detail-v3", channelId, version],
        { revalidate: 3600 },
    )();
}

/** 채널 페이지 하단 '비슷한 채널' 한 줄 */
export interface RelatedChannel {
    channel_id: string;
    channel_title: string;
    subscriber_count: number;
}

/** 비슷한 채널 몇 개를 보여 줄지 */
const RELATED_LIMIT = 6;

/**
 * 같은 카테고리에서 구독자 규모가 가장 가까운 채널들.
 *
 * [2026-10-06] 채널 상세끼리 서로 링크가 하나도 없어 구글이 사이트맵으로만
 * 발견했다. 서치콘솔에서 3,215개가 '발견됨 - 현재 색인이 생성되지 않음'(방문
 * 대기)이라, 이미 방문한 페이지에서 링크를 타고 넘어가도록 내부 링크를 단다.
 * '규모가 가깝다'는 구독자 수의 로그 거리로 본다 (1만↔2만이 100만↔101만보다 멀다).
 *
 * [2026-10-31] 후보는 보드에서 페이지가 있는 채널이다. 위·아래로 몇 개씩만 받아 고른다.
 */
function pickRelated(rows: RelatedChannel[], selfId: string, subs: number): RelatedChannel[] {
    const base = Math.log10(Math.max(subs, 1));
    return rows
        .filter((c) => c.channel_id !== selfId && c.channel_title)
        .map((c) => ({ c, d: Math.abs(Math.log10(Math.max(c.subscriber_count, 1)) - base) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, RELATED_LIMIT)
        .map(({ c }) => c);
}

async function sbRelated(selfId: string, category: string, subs: number): Promise<RelatedChannel[]> {
    const near = (above: boolean) => {
        const q = supabase()
            .from("channel_board")
            .select("channel_id,channel_title,subscriber_count")
            .eq("main_category", category)
            .eq("has_page", true)
            .neq("channel_id", selfId);
        return (above ? q.gte("subscriber_count", subs) : q.lt("subscriber_count", subs))
            .order("subscriber_count", { ascending: above })
            .limit(RELATED_LIMIT);
    };
    const [up, down] = await Promise.all([near(true), near(false)]);
    // 비슷한 채널은 덤이다. 실패해도 페이지는 그린다.
    if (up.error || down.error) return [];
    return pickRelated([...(up.data ?? []), ...(down.data ?? [])] as RelatedChannel[], selfId, subs);
}

/**
 * 보드 전체·카테고리별 채널 수와 구독자 중위값 (구체화 뷰 channel_board_category_stats, 16행).
 * 모든 채널 페이지가 같은 값을 쓰므로 한 번만 받아 나눠 쓴다.
 */
interface BoardTotals {
    overall: number;
    ranked: number;
    byCategory: Record<string, { tracked: number; median: number }>;
}

const sbBoardTotals = unstable_cache(
    async (): Promise<BoardTotals> => {
        const { data, error } = await supabase()
            .from("channel_board_category_stats")
            .select("main_category,tracked,ranked,median_subscribers");
        if (error) throw new Error(`Supabase 보드 숫자 조회 실패: ${error.message}`);
        const rows = (data ?? []) as { main_category: string; tracked: number; ranked: number; median_subscribers: number | null }[];
        if (rows.length === 0) throw new Error("보드 숫자가 비어 있습니다.");
        return {
            overall: rows.reduce((n, r) => n + r.tracked, 0),
            ranked: rows.reduce((n, r) => n + r.ranked, 0),
            byCategory: Object.fromEntries(
                rows.map((r) => [r.main_category, { tracked: r.tracked, median: r.median_subscribers ?? 0 }]),
            ),
        };
    },
    ["sb-board-totals-v1"],
    { revalidate: SB_REVALIDATE },
);

/** 채널 상세가 보드에서 읽는 칸 (channel_board, utube_rank/sql/steps/19·21) */
const BOARD_DETAIL_COLUMNS =
    "channel_id,channel_title,target_date,main_category,league_group,channel_created_at," +
    "subscriber_count,total_view_count,video_count,avg_daily_view_increase,avg_daily_sub_increase," +
    "damped_score,representative_video_id,video_thumbnail,top_video_views,is_new_channel," +
    "subs_rank,category_subs_rank,rising_rank,sparkline_data";

interface BoardDetailRow {
    subs_rank: number | null;
    category_subs_rank: number | null;
    rising_rank: number | null;
    sparkline_data: TierChannel["sparkline_data"];
}

/**
 * 채널 상세 — 아카이브 기반.
 *
 * 출처가 두 개다.
 *   channel_archive   한 번 순위에 오른 채널의 영구 기록. 여기 있으면 페이지가 있다.
 *   channel_board     오늘 '지금 뜨는 채널' 보드(최근 7일 안에 수집된 국내 채널 전부).
 *                     여기 있으면 '현재'이고 순위·추이를 붙인다.
 *                     [2026-10-31] 전에는 8,000곳 선별 순위(channel_ranking)였다. 보드 1위 채널이
 *                     상세에서는 '순위에 없는 채널'로 보이는 일이 없도록 같은 표를 본다.
 *
 * 보드에 없는 채널은 아카이브의 마지막 값으로 그리되 isCurrent=false 로 표시해
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

            // ② 오늘 보드 — 있으면 현재 값과 추이를 쓴다.
            const { data: cur, error: cErr } = await sb
                .from("channel_board")
                .select(BOARD_DETAIL_COLUMNS)
                .eq("channel_id", channelId)
                .maybeSingle();
            if (cErr) throw new Error(`Supabase 채널 조회 실패: ${cErr.message}`);

            const isCurrent = Boolean(cur);
            const board = cur as unknown as BoardDetailRow | null;
            // 현재 값이 있으면 그걸, 없으면 아카이브의 마지막 값을 쓴다.
            // 보드에 없는 칸(tier·country_code)은 아카이브 값을 두고, 보드는 국내 채널만 싣는다.
            const channel = (cur
                ? { ...(arc as object), ...(cur as object), origin_type: "DOMESTIC" }
                : arc) as unknown as TierChannel;
            if ((channel.subscriber_count ?? 0) < CHANNEL_PAGE_MIN_SUBSCRIBERS) return null;

            // 순위는 오늘 보드에 있을 때만 의미가 있다. 순위 값은 보드를 적재할 때 미리 계산해 둔다.
            let overallRank = 0, overallTotal = 0, categoryRank = 0, categoryTotal = 0;
            let risingRank = 0, risingTotal = 0;
            const [totals, related] = await Promise.all([
                sbBoardTotals(),
                sbRelated(channelId, channel.main_category, channel.subscriber_count ?? 0),
            ]);
            const cat = totals.byCategory[channel.main_category];
            const categoryMedianSubscribers = isCurrent ? cat?.median ?? 0 : 0;
            if (isCurrent && board) {
                overallRank = board.subs_rank ?? 0;
                overallTotal = totals.overall;
                categoryRank = board.category_subs_rank ?? 0;
                categoryTotal = cat?.tracked ?? 0;
                risingRank = board.rising_rank ?? 0;
                risingTotal = totals.ranked;
            }

            // ③ 최근 30일 기록 — 없어도 페이지는 그린다 (실패해도 본문만 빠진다).
            const { data: rec } = await sb
                .from("channel_recent")
                .select("videos,videos_30d,shorts_30d,subs_from,subs_from_date,subs_to,subs_to_date,insight")
                .eq("channel_id", channelId)
                .maybeSingle();

            // ④ 채널 고유 정보 — 없어도 페이지는 그린다.
            const { data: extra } = await sb
                .from("channel_extra")
                .select("topics,weekday,long_n,long_avg_sec,short_n,short_avg_sec")
                .eq("channel_id", channelId)
                .maybeSingle();

            const a = arc as { first_seen: string; last_seen: string; days_seen: number; search_open?: boolean };
            return {
                channel,
                // 추이는 오늘 보드에 있을 때만 있다 (아카이브엔 sparkline 을 넣지 않는다).
                sparkline: board ? cleanSparkline(parseSparkline(board.sparkline_data)) : [],
                overallRank, overallTotal, categoryRank, categoryTotal, categoryMedianSubscribers,
                risingRank, risingTotal,
                isCurrent,
                firstSeen: a.first_seen ?? null,
                lastSeen: a.last_seen ?? null,
                daysSeen: a.days_seen ?? 0,
                searchOpen: Boolean(a.search_open),
                related,
                recent: (rec as ChannelRecent | null) ?? null,
                extra: (extra as ChannelExtra | null) ?? null,
            };
        },
        ["sb-channel-detail-v7", channelId],
        { revalidate: SB_REVALIDATE },
    )();
}

/** 채널 상세. 출처 스위치에 따라 GitHub 파일 또는 Supabase 를 읽는다. */
export async function getChannel(channelId: string): Promise<ChannelDetail | null> {
    if (isSupabase) return sbChannelCached(channelId);
    return getChannelCached(channelId, await getCdnVersion(CHANNELS_URL));
}
