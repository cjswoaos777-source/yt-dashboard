import { unstable_cache } from "next/cache";
import { INSIGHTS_URL, getCdnVersion } from "@/lib/cdn";
import { isSupabase } from "@/lib/datasource";
import { supabase } from "@/lib/supabase";
import { reportSummary } from "@/lib/insight-text";

/**
 * 인사이트 리포트 데이터.
 *
 * 랭킹·태그와 달리 이 수치는 배포 파일에 없던 값이라 파이프라인에 집계 export 를
 * 새로 만들었다(sync_insights). 30일 누적이라 시간 단위로 바뀌지 않으므로
 * Flow A(하루 1회)에서만 갱신된다.
 */

export interface HourRow { hour: number; videos: number; median_views: number }
export interface DowRow { dow: number; videos: number; median_views: number }
export interface FormatRow {
    format: "shorts" | "longform";
    videos: number;
    like_rate: number;
    comment_rate: number;
    median_views: number;
}
export interface DurationRow { bucket: string; videos: number; median_views: number }
export interface ChannelAgeRow {
    bucket: string;
    channels: number;
    avg_daily_views: number;
    median_subs: number;
}

export interface Insights {
    generated_at: string;
    window_days: number;
    min_views: number;
    sample_size: number;
    upload_hour: HourRow[];
    day_of_week: DowRow[];
    format: FormatRow[];
    duration: DurationRow[];
    channel_age: ChannelAgeRow[];
}

// 라벨은 결론 문장을 만드는 insight-text.ts 로 옮겼다 (그쪽은 순수 함수만 둔다).
export { DOW_LABEL, DURATION_LABEL, AGE_LABEL } from "@/lib/insight-text";

async function fetchInsights(): Promise<Insights> {
    const res = await fetch(INSIGHTS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`CDN fetch failed: ${res.status} ${res.statusText}`);

    const contentType = res.headers.get("content-type") ?? "";
    let raw: unknown;
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
    return raw as Insights;
}

const getInsightsCached = (version: string) => unstable_cache(
    async (): Promise<Insights> => fetchInsights(),
    ["insights-v1", version],
    { revalidate: 3600 },
)();

/**
 * Supabase 경로. insights 테이블의 'latest' 1행에서 payload 를 그대로 읽는다.
 * 파일과 같은 모양이라 아래 화면 코드가 바뀌지 않는다.
 * 하루 1회 갱신되는 값이라 캐시를 길게 잡아도 된다.
 */
const getInsightsFromSupabase = unstable_cache(
    async (): Promise<Insights> => {
        const { data, error } = await supabase()
            .from("insights")
            .select("payload")
            .eq("id", "latest")
            .maybeSingle();
        if (error) throw new Error(`Supabase 인사이트 조회 실패: ${error.message}`);
        if (!data?.payload) throw new Error("인사이트 데이터가 아직 없습니다");
        return data.payload as Insights;
    },
    ["sb-insights-v1"],
    { revalidate: 3600 },
);

/** 실패하면 null. 호출부에서 404 로 처리해 빈 페이지가 색인되지 않게 한다. */
export async function getInsights(): Promise<Insights | null> {
    try {
        if (isSupabase) return await getInsightsFromSupabase();
        return await getInsightsCached(await getCdnVersion(INSIGHTS_URL));
    } catch {
        return null;
    }
}

/**
 * summary 는 데이터를 못 받았을 때만 쓰는 문장이다. 보통은 insightSummary 가 그날 숫자로 만든다.
 * [2026-10-31] 예전 요약('1.4배', '3.5배', '1년 미만이 가장 높다')은 표본이 바뀌어 틀린 말이 돼서 숫자 없는 말로 바꿨다.
 */
export const INSIGHT_REPORTS = [
    {
        slug: "upload-time",
        title: "유튜브 몇 시에 올려야 잘 될까",
        summary: "업로드 시간대와 요일에 따라 중위 조회수가 얼마나 달라지는지 봅니다.",
    },
    {
        slug: "shorts-vs-longform",
        title: "숏츠와 롱폼, 무엇이 유리한가",
        summary: "숏츠와 롱폼의 조회수, 좋아요·댓글 비율을 비교합니다.",
    },
    {
        slug: "channel-age",
        title: "채널이 오래될수록 유리할까",
        summary: "채널 나이에 따라 일평균 조회수가 어떻게 다른지 봅니다.",
    },
] as const;

/** 목록·검색 결과용 한 줄 요약. 데이터가 있으면 그날 숫자로 만든다. */
export function insightSummary(slug: InsightSlug, data: Insights | null): string {
    const fallback = INSIGHT_REPORTS.find((r) => r.slug === slug)!.summary;
    return (data && reportSummary(slug, data)) || fallback;
}

export type InsightSlug = (typeof INSIGHT_REPORTS)[number]["slug"];

export function isInsightSlug(v: string): v is InsightSlug {
    return INSIGHT_REPORTS.some((r) => r.slug === v);
}
