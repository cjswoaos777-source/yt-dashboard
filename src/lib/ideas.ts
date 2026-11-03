import { unstable_cache } from "next/cache";
import { isSupabase } from "@/lib/datasource";
import { supabase } from "@/lib/supabase";

/**
 * '지금 만들 만한 영상' 리포트.
 *
 * 파이프라인(utube_rank/ideas_report.py)이 매시간 idea_reports 'latest' 행을 덮어쓴다.
 * 고르는 기준(rules)도 payload 에 같이 들어 있어 화면과 메일이 같은 말을 쓴다.
 * 유튜브 API 데이터가 들어가므로 날짜 행은 30일 뒤 지운다(report_mail.py).
 *
 * [2026-11-03] /ideas('지금 만들 만한 영상')는 small_topics(작은 채널 기준 주제, 카테고리별)를 보여 준다.
 * 그 칸이 없으면 small_by_category(작은 채널 터진 영상)로 보여 준다.
 * 주제 추천(ideas 등)은 파이프라인이 계속 만들지만 화면에서는 쓰지 않는다.
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

/** 작은 채널에서 터진 영상 한 개. ratio = 조회수 ÷ 구독자 수 */
export interface SmallVideo extends IdeaVideo { ratio: number }
export interface SmallSection {
    category: string;   // 유튜브 카테고리 영문 이름
    label: string;      // 화면 이름
    count: number;      // 이 카테고리에서 터진 영상 수 (거른 뒤)
    videos: SmallVideo[];
}
export interface SmallByCategory {
    sections: SmallSection[];
    total: number;
    removed: Record<string, number>;
    rules: string[];
    note: string;
}

/** [2026-11-03 오후] 작은 채널 기준 주제(태그 묶음). 사용자: 예전 주제 추천처럼, 기준만 작은 채널로. */
export interface SmallTopic {
    topic: string;
    format: "shorts" | "long";
    headline: string;
    badges: string[];
    why: string[];
    stats: { videos: number; channels: number; hits: number; hit_channels: number; median_hourly: number; new: boolean };
    examples: SmallVideo[];
}
export interface SmallTopicSection { category: string; label: string; topics: SmallTopic[] }
export interface SmallTopics {
    sections: SmallTopicSection[];
    small_videos: number;
    clean_videos: number;
    rules: string[];
    note: string;
}

export interface IdeaReport {
    generated_at: string;
    sample: { videos: number; topics: number };
    small_topics?: SmallTopics;
    small_by_category?: SmallByCategory;
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
    ["sb-ideas-v3"],   // v3: small_topics 가 생겼다 (11-03 오후)
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
