import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const NOTICES_DIR = path.join(process.cwd(), "content", "notices");

export type NoticeCategory = "운영" | "업데이트" | "장애";

export interface NoticeMeta {
    slug: string;
    title: string;
    date: string;          // YYYY-MM-DD
    category: NoticeCategory | string;
}

export interface Notice extends NoticeMeta {
    contentHtml: string;
    excerpt: string;       // 본문 앞부분 발췌 — meta description 용
}

// ─── 카테고리 색상 매핑 ────────────────────────────────────────────────────
export function getCategoryColor(category: string): {
    bg: string;
    text: string;
    border: string;
} {
    switch (category) {
        case "운영":
            return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
        case "업데이트":
            return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
        case "장애":
            return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" };
        default:
            return { bg: "bg-neutral-100", text: "text-neutral-600", border: "border-neutral-200" };
    }
}

// ─── 모든 공지 메타 가져오기 (최신순) ──────────────────────────────────────
export function getAllNotices(): NoticeMeta[] {
    if (!fs.existsSync(NOTICES_DIR)) {
        return [];
    }

    const files = fs.readdirSync(NOTICES_DIR).filter((f) => f.endsWith(".md"));
    const notices: NoticeMeta[] = files.map((filename) => {
        const slug = filename.replace(/\.md$/, "");
        const raw = fs.readFileSync(path.join(NOTICES_DIR, filename), "utf-8");
        const { data } = matter(raw);
        return {
            slug,
            title: data.title ?? slug,
            date: data.date ?? "",
            category: data.category ?? "",
        };
    });

    return notices.sort((a, b) => b.date.localeCompare(a.date));
}

// ─── 특정 공지 단일 조회 (HTML 변환 포함) ──────────────────────────────────
export async function getNoticeBySlug(slug: string): Promise<Notice | null> {
    const filepath = path.join(NOTICES_DIR, `${slug}.md`);
    if (!fs.existsSync(filepath)) return null;

    const raw = fs.readFileSync(filepath, "utf-8");
    const { data, content } = matter(raw);
    const processed = await remark().use(html).process(content);
    const contentHtml = processed.toString();

    // HTML 태그 제거 후 앞 150자 발췌
    const plain = contentHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const excerpt = plain.length > 150 ? `${plain.slice(0, 150)}…` : plain;

    return {
        slug,
        title: data.title ?? slug,
        date: data.date ?? "",
        category: data.category ?? "",
        contentHtml,
        excerpt,
    };
}

// ─── 최신 공지 1개 (배너용) ────────────────────────────────────────────────
export function getLatestNotice(): NoticeMeta | null {
    const notices = getAllNotices();
    return notices[0] ?? null;
}
