import { unstable_cache } from "next/cache";
import { isSupabase } from "@/lib/datasource";
import { supabase } from "@/lib/supabase";

/**
 * '지금 만들 만한 영상' 리포트.
 *
 * 파이프라인(utube_rank/ideas_report.py)이 매시간 idea_reports 'latest' 행을 덮어쓴다.
 * 고르는 기준(rules)도 payload 에 같이 들어 있어 화면과 메일이 같은 말을 쓴다.
 * 유튜브 API 데이터가 들어가므로 날짜 행은 30일 뒤 지운다(report_mail.py).
 */

export interface IdeaVideo {
    video_id: string;
    title: string;
    channel_id: string;
    channel_title: string;
    subscribers: number;
    views: number;
    hourly: number;
    is_shorts: boolean;
    reupload: boolean;
    topics?: string[];
}

export interface Idea {
    topic: string;
    format: "shorts" | "long";
    headline: string;
    badges: string[];
    why: string[];
    tip: string;
    title_words: string[];
    stats: { videos: number; channels: number; median_hourly: number; shorts: number; small_hits: number; new: boolean };
    examples: IdeaVideo[];
}

export interface TopicRow { topic: string; videos: number; channels: number; median_hourly: number }
export interface FormatStat { videos: number; median_hourly: number; median_views: number }
export interface CategoryStat { category: string; median_hourly: number; videos: number }

export interface IdeaReport {
    generated_at: string;
    sample: { videos: number; topics: number };
    ideas: Idea[];
    small_hits: IdeaVideo[];
    small_hits_note: string;
    formats: {
        shorts: FormatStat;
        long: FormatStat;
        best_categories: { shorts: CategoryStat[]; long: CategoryStat[] };
    };
    broad: TopicRow[];
    crowded: TopicRow[];
    avoid: { topic: string; reason: string }[];
    rules: string[];
}

const getIdeasFromSupabase = unstable_cache(
    async (): Promise<IdeaReport> => {
        const { data, error } = await supabase()
            .from("idea_reports")
            .select("payload")
            .eq("id", "latest")
            .maybeSingle();
        if (error) throw new Error(`Supabase 아이디어 리포트 조회 실패: ${error.message}`);
        if (!data?.payload) throw new Error("아이디어 리포트가 아직 없습니다");
        return data.payload as IdeaReport;
    },
    ["sb-ideas-v1"],
    // 매시간 :30 무렵 새로 만들어진다. 30분 캐시면 늦어도 한 시간 안에 반영된다.
    { revalidate: 1800 },
);

/** 실패하거나 Supabase 모드가 아니면 null. 호출부는 '준비 중' 화면을 보여 준다. */
export async function getIdeas(): Promise<IdeaReport | null> {
    if (!isSupabase) return null;
    try {
        return await getIdeasFromSupabase();
    } catch {
        return null;
    }
}

export function watchUrl(v: Pick<IdeaVideo, "video_id" | "is_shorts">): string {
    return `https://www.youtube.com/${v.is_shorts ? "shorts/" : "watch?v="}${v.video_id}`;
}

export function fmtKr(n: number): string {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1).replace(/\.0$/, "")}억`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(1).replace(/\.0$/, "")}만`;
    return n.toLocaleString();
}

export const FREQUENCY_LABEL = {
    weekly: "주 1회 (월요일 아침)",
    twice: "주 2회 (월·목 아침)",
    daily: "매일 아침",
} as const;
export type Frequency = keyof typeof FREQUENCY_LABEL;
export const FREQUENCIES = Object.keys(FREQUENCY_LABEL) as Frequency[];
