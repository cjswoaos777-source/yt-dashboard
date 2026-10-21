import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

/**
 * 주간 트렌드 리포트.
 *
 * [2026-10-21] 구글이 사이트를 '대량 자동 생성'으로 낮게 평가하는 중이라, 우리 데이터로
 * 해석한 글을 매주 쌓는다. 한 주에 파일이 두 개다.
 *   content/reports/{slug}.json  숫자 (utube_rank/weekly_report.py 가 만든다)
 *   content/reports/{slug}.md    해석 글 (Claude 초안 + 사용자 확인). status: published 일 때만 공개
 * md 가 없거나 draft 면 목록·사이트맵에 나오지 않는다. 숫자만 있는 자동 페이지를 내보내지
 * 않으려는 것이다. draft 는 주소를 알면 볼 수 있지만 noindex 다(검토용).
 */

const REPORTS_DIR = path.join(process.cwd(), "content", "reports");

export interface ReportRow {
    video_id?: string;
    title?: string;
    channel_id?: string;
    channel_title?: string;
    category?: string;
    is_shorts?: boolean;
    views?: number;
    subs?: number | null;
    d?: string;
    ratio?: number;
    created?: string;
}

export interface ReportData {
    slug: string;
    period_start: string;
    period_end: string;
    prev_start: string;
    generated_at: string;
    totals: Record<"cur" | "prev", { videos: number; shorts: number; median_views: number; channels: number }>;
    format: { wk: "cur" | "prev"; is_shorts: boolean; n: number; median_views: number; p90_views: number }[];
    categories: {
        category: string; n: number; prev_n: number;
        median_views: number; prev_median_views: number; shorts_n: number;
    }[];
    top_videos: ReportRow[];
    small_channel_hits: ReportRow[];
    new_channels: ReportRow[];
    by_day: { d: string; n: number; median_views: number }[];
}

export interface ReportMeta {
    slug: string;
    title: string;
    date: string;
    summary: string;
    status: "published" | "draft";
    period_start: string;
    period_end: string;
}

export interface Report extends ReportMeta {
    contentHtml: string;
    data: ReportData;
}

function readMeta(slug: string): ReportMeta | null {
    const mdPath = path.join(REPORTS_DIR, `${slug}.md`);
    const jsonPath = path.join(REPORTS_DIR, `${slug}.json`);
    if (!fs.existsSync(mdPath) || !fs.existsSync(jsonPath)) return null;
    const { data } = matter(fs.readFileSync(mdPath, "utf-8"));
    const nums = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as ReportData;
    return {
        slug,
        title: data.title ?? slug,
        date: data.date ?? "",
        summary: data.summary ?? "",
        status: data.status === "published" ? "published" : "draft",
        period_start: nums.period_start,
        period_end: nums.period_end,
    };
}

/** 공개된 리포트 (최신순) */
export function getPublishedReports(): ReportMeta[] {
    if (!fs.existsSync(REPORTS_DIR)) return [];
    return fs.readdirSync(REPORTS_DIR)
        .filter((f) => f.endsWith(".md"))
        .map((f) => readMeta(f.replace(/\.md$/, "")))
        .filter((m): m is ReportMeta => m !== null && m.status === "published")
        .sort((a, b) => b.period_start.localeCompare(a.period_start));
}

/** 모든 리포트 slug (초안 포함) — 정적 생성용 */
export function getAllReportSlugs(): string[] {
    if (!fs.existsSync(REPORTS_DIR)) return [];
    return fs.readdirSync(REPORTS_DIR)
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(/\.md$/, ""))
        .filter((slug) => readMeta(slug) !== null);
}

export async function getReport(slug: string): Promise<Report | null> {
    if (!/^\d{4}-w\d{2}$/.test(slug)) return null;
    const meta = readMeta(slug);
    if (!meta) return null;
    const { content } = matter(fs.readFileSync(path.join(REPORTS_DIR, `${slug}.md`), "utf-8"));
    const contentHtml = (await remark().use(html).process(content)).toString();
    const data = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, `${slug}.json`), "utf-8")) as ReportData;
    return { ...meta, contentHtml, data };
}
