import { unstable_cache } from "next/cache";
import { INSIGHTS_URL, getCdnVersion } from "@/lib/cdn";

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

export const DOW_LABEL = ["", "일", "월", "화", "수", "목", "금", "토"];

export const DURATION_LABEL: Record<string, string> = {
    a_under5: "5분 미만",
    b_5to10: "5~10분",
    c_10to20: "10~20분",
    d_over20: "20분 이상",
};

export const AGE_LABEL: Record<string, string> = {
    a_under3m: "3개월 미만",
    b_under1y: "3개월 ~ 1년",
    c_under3y: "1년 ~ 3년",
    d_over3y: "3년 이상",
};

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

/** 실패하면 null. 호출부에서 404 로 처리해 빈 페이지가 색인되지 않게 한다. */
export async function getInsights(): Promise<Insights | null> {
    try {
        return await getInsightsCached(await getCdnVersion(INSIGHTS_URL));
    } catch {
        return null;
    }
}

export const INSIGHT_REPORTS = [
    {
        slug: "upload-time",
        title: "유튜브 몇 시에 올려야 잘 될까",
        summary: "업로드 시간대에 따라 중위 조회수가 1.4배까지 갈립니다. 요일은 거의 영향이 없습니다.",
    },
    {
        slug: "shorts-vs-longform",
        title: "숏츠와 롱폼, 무엇이 유리한가",
        summary: "숏츠는 조회수가 3.5배 많지만, 좋아요·댓글 비율은 롱폼이 훨씬 높습니다.",
    },
    {
        slug: "channel-age",
        title: "채널이 오래될수록 유리할까",
        summary: "오히려 1년 미만 채널의 일평균 조회수가 가장 높았습니다.",
    },
] as const;

export type InsightSlug = (typeof INSIGHT_REPORTS)[number]["slug"];

export function isInsightSlug(v: string): v is InsightSlug {
    return INSIGHT_REPORTS.some((r) => r.slug === v);
}
