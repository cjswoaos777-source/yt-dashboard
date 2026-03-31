"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ViralVideo } from "@/lib/viral-types";
import { RANKING_URL } from "@/lib/cdn";

// ─── updatedAt 파싱: '2026-03-31-10' 또는 HH:MM → '10시'
function parseUpdatedHour(raw: string): string {
    // '2026-03-31-10' 형식
    const dashMatch = raw.match(/(\d{4}-\d{2}-\d{2})-(\d{1,2})$/);
    if (dashMatch) return `${parseInt(dashMatch[2], 10)}시`;
    // 'HH:MM' 형식
    const colonMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (colonMatch) return `${parseInt(colonMatch[1], 10)}시`;
    return raw;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "hourly_views" | "total_views" | "hourly_likes" | "hourly_comments";
type ShortsState = null | boolean;
type OriginState = null | "DOMESTIC" | "IMPORTED";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtKr(n: number, unit = ""): string {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억${unit}`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만${unit}`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천${unit}`;
    return `${n.toLocaleString()}${unit}`;
}

function getHeroLabel(sortBy: SortKey): string {
    switch (sortBy) {
        case "hourly_views": return "조회수 급상승";
        case "total_views": return "누적 조회수";
        case "hourly_likes": return "좋아요 급상승";
        case "hourly_comments": return "댓글 급상승";
    }
}

function getHeroValue(v: ViralVideo, sortBy: SortKey): string {
    switch (sortBy) {
        case "hourly_views": return fmtKr(v.hourly_view_increase, "회");
        case "total_views": return fmtKr(v.total_views, "회");
        case "hourly_likes": return fmtKr(v.hourly_like_increase);
        case "hourly_comments": return fmtKr(v.hourly_comment_increase);
    }
}

function getSortValue(v: ViralVideo, sortBy: SortKey): number {
    switch (sortBy) {
        case "hourly_views": return v.hourly_view_increase ?? 0;
        case "total_views": return v.total_views ?? 0;
        case "hourly_likes": return v.hourly_like_increase ?? 0;
        case "hourly_comments": return v.hourly_comment_increase ?? 0;
    }
}

function thumbUrl(videoId: string) {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

// ─── Pill Button ──────────────────────────────────────────────────────────────

function Pill({ active, onClick, children }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                fontFamily: "var(--font-pretendard), 'Pretendard', sans-serif"
            }}
            className={cn(
                "relative inline-flex items-center justify-center gap-1.5 rounded-full px-[14px] h-[32px] text-[13px] font-medium select-none whitespace-nowrap",
                "hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]",
                "active:scale-95",
                active
                    ? "bg-black text-white shadow-sm border border-black"
                    : "bg-white border border-neutral-200 text-[#555555] hover:border-neutral-300 hover:text-neutral-900"
            )}
        >
            {active && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0 -ml-0.5">
                    <path d="M1.5 5.5L3.5 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
            {children}
        </button>
    );
}

// ─── Home Info Panel ──────────────────────────────────────────────────────────

function HomeInfoPanel() {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[12px] font-medium text-neutral-500 shadow-sm transition-all hover:border-neutral-300 hover:text-neutral-800 hover:shadow"
            >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <circle cx="6.5" cy="6.5" r="6" stroke="currentColor" strokeWidth="1.2" />
                    <text x="6.5" y="10" textAnchor="middle" fontSize="8" fill="currentColor" fontWeight="700">?</text>
                </svg>
                랭킹 산정 방식
                <svg
                    width="10" height="10" viewBox="0 0 10 10" fill="none"
                    className={cn("transition-transform duration-200", open ? "rotate-180" : "")}
                >
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
            </button>

            {open && (
                <div className="absolute left-0 top-full z-50 mt-2 w-[min(420px,90vw)] rounded-2xl border border-neutral-100 bg-white p-5 shadow-xl">
                    {/* 제목 */}
                    <h3 className="mb-3 text-[15px] font-black tracking-tight text-neutral-900">
                        🔥 실시간 떡상 영상 랭킹이란?
                    </h3>
                    {/* 본문 */}
                    <p className="text-[13px] leading-relaxed text-neutral-600">
                        채널의 체급(구독자 수)이라는 계급장을 떼고, 지금 이 순간 유튜브 알고리즘의 선택을 받아
                        가장 무섭게 터지고 있는 <strong className="text-neutral-800">&apos;신규 영상&apos;</strong>들만 모아둔
                        실시간 트렌드 지표입니다.
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-neutral-600">
                        지금 당장 조회수를 쓸어 담고 있는 영상의 썸네일과 제목 기획을 참고해 보세요.
                    </p>
                    {/* 닫기 */}
                    <button
                        onClick={() => setOpen(false)}
                        className="mt-4 text-[11px] font-medium text-neutral-400 hover:text-neutral-700"
                    >
                        닫기 ✕
                    </button>
                </div>
            )}
        </div>
    );
}



// ─── Video Card Skeleton ──────────────────────────────────────────────

function VideoCardSkeleton() {
    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm">
            <div className="relative aspect-video w-full animate-pulse bg-neutral-200" />
            <div className="flex flex-col p-4 gap-3">
                <div className="flex items-center gap-2">
                    <div className="h-5 w-5 animate-pulse rounded-full bg-neutral-200" />
                    <div className="h-4 w-3/4 animate-pulse rounded-lg bg-neutral-200" />
                </div>
                <div className="h-3 w-1/2 animate-pulse rounded-lg bg-neutral-100" />
                <div className="mt-1 flex justify-between">
                    <div className="h-8 w-24 animate-pulse rounded-xl bg-orange-50" />
                    <div className="h-8 w-20 animate-pulse rounded-xl bg-neutral-100" />
                </div>
                <div className="flex gap-1.5 mt-1">
                    <div className="h-5 w-16 animate-pulse rounded-full bg-neutral-100" />
                    <div className="h-5 w-12 animate-pulse rounded-full bg-neutral-100" />
                </div>
            </div>
        </div>
    );
}

// ─── Video Card ────────────────────────────────────────────────────

function VideoCard({ video, rank, sortBy }: { video: ViralVideo; rank: number; sortBy: SortKey }) {
    const [imgError, setImgError] = useState(false);
    const isShorts = video.video_type === "Shorts 📱";

    return (
        <a
            href={`https://www.youtube.com/watch?v=${video.video_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        >
            {/* Thumbnail */}
            <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
                {!imgError ? (
                    <Image
                        src={thumbUrl(video.video_id)}
                        alt={video.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => setImgError(true)}
                        unoptimized
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl">
                        {isShorts ? "📱" : "📺"}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
                <div className="absolute left-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/80 text-xs font-bold text-white shadow backdrop-blur-sm">
                    {rank}
                </div>
                <div className="absolute right-2.5 top-2.5 z-20 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                    {video.video_type}
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col p-4">
                <p className="mb-1 text-[11px] text-neutral-400" style={{ fontWeight: 500, letterSpacing: "0.02em" }}>
                    {video.channel_title}
                </p>
                <div className="min-h-[3em]">
                    <h3 className="line-clamp-2 text-sm leading-snug text-neutral-900" style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
                        {video.title}
                    </h3>
                </div>
                <div className="flex-1" />
                <div className="mt-3">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-neutral-400">
                        {getHeroLabel(sortBy)}
                    </p>
                    <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1"
                        style={{ background: "rgba(16, 185, 129, 0.10)" }}
                    >
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
                            <path d="M4.5 1.5L8 7.5H1L4.5 1.5Z" fill="#10B981" />
                        </svg>
                        <span className="text-[15px] leading-none" style={{ fontWeight: 600, color: "#10B981", letterSpacing: "-0.01em" }}>
                            {getHeroValue(video, sortBy)}
                        </span>
                    </span>
                </div>
                <p className="mt-2 text-[11px] text-[#555555]" style={{ fontWeight: 500 }}>
                    총 {fmtKr(video.total_views, "회")} &middot; 좋아요 {fmtKr(video.total_likes)} &middot; 댓글 {fmtKr(video.total_comments)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {video.category_name && (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-medium text-neutral-500">
                            {video.category_name}
                        </span>
                    )}
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-medium text-neutral-500">
                        {video.origin_type === "DOMESTIC" ? "🇰🇷 국내" : "🌐 해외"}
                    </span>
                </div>
            </div>
        </a>
    );
}

// ─── Share Button ─────────────────────────────────────────────────────────────

function ShareButton() {
    const [copied, setCopied] = useState(false);
    function handleCopy() {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }
    return (
        <button
            onClick={handleCopy}
            title="현재 필터 URL 복사"
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[12px] font-medium text-neutral-500 shadow-sm transition-all hover:border-neutral-300 hover:text-neutral-800 hover:shadow"
        >
            {copied ? (
                <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span className="text-emerald-600">링크 복사됨!</span>
                </>
            ) : (
                <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 1H11V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M4 11H1V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M11 1L6.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M1 11L5.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                    공유
                </>
            )}
        </button>
    );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function DashboardClient({
    initialVideos,
    categories: initialCategories,
    updatedAt,
}: {
    initialVideos: ViralVideo[];
    allVideos: ViralVideo[];
    categories: string[];
    updatedAt: string;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // ── URL 파라미터에서 필터 초기값 읽기 ──────────────────────────────────
    function initSortBy(): SortKey {
        const v = searchParams.get("sort");
        if (v === "hourly_views" || v === "total_views" || v === "hourly_likes" || v === "hourly_comments") return v;
        return "hourly_views";
    }
    function initIsShorts(): ShortsState {
        const v = searchParams.get("format");
        if (v === "Shorts") return true;
        if (v === "Long-form") return false;
        return null;
    }
    function initOrigin(): OriginState {
        const v = searchParams.get("region");
        if (v === "국내" || v === "DOMESTIC") return "DOMESTIC";
        if (v === "해외" || v === "IMPORTED") return "IMPORTED";
        return null;
    }

    const [sortBy, setSortByState] = useState<SortKey>(initSortBy);
    const [isShorts, setIsShortsState] = useState<ShortsState>(initIsShorts);
    const [origin, setOriginState] = useState<OriginState>(initOrigin);
    const [category, setCategoryState] = useState<string | null>(searchParams.get("category"));

    // ── URL 업데이트 헬퍼 ────────────────────────────────────────────────────
    const syncUrl = useCallback((updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([k, v]) => {
            if (v === null) params.delete(k); else params.set(k, v);
        });
        const qs = params.toString();
        router.push(qs ? `?${qs}` : "?", { scroll: false });
    }, [router, searchParams]);

    function setSortBy(v: SortKey) { setSortByState(v); syncUrl({ sort: v === "hourly_views" ? null : v }); }
    function setIsShorts(v: ShortsState) { setIsShortsState(v); syncUrl({ format: v === true ? "Shorts" : v === false ? "Long-form" : null }); }
    function setOrigin(v: OriginState) { setOriginState(v); syncUrl({ region: v === "DOMESTIC" ? "국내" : v === "IMPORTED" ? "해외" : null }); }
    function setCategory(v: string | null) { setCategoryState(v); syncUrl({ category: v }); }

    // ── CDN에서 전체 JSON 최초 1회 로드 ────────────────────────────────────────
    const [allVideos, setAllVideos] = useState<ViralVideo[]>(initialVideos);
    const [categories, setCategories] = useState<string[]>(initialCategories);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(() => {
        setLoading(true);
        setError(null);
        fetch(RANKING_URL)
            .then((r) => {
                if (!r.ok) throw new Error(`CDN ${r.status}`);
                return r.json() as Promise<ViralVideo[]>;
            })
            .then((data) => {
                setAllVideos(data);
                const catSet = new Set<string>();
                for (const v of data) { if (v.category_name) catSet.add(v.category_name); }
                setCategories(Array.from(catSet).sort());
            })
            .catch((e) => { setError(e.message); })
            .finally(() => { setLoading(false); });
    }, []);

    useEffect(() => { refetch(); }, [refetch]);


    // ── 클라이언트 사이드 필터 + 정렬 (재쿼리 없음) ────────────────────────────
    const videos = useMemo(() => {
        let filtered = allVideos;
        if (isShorts === true) filtered = filtered.filter((v) => v.video_type === "Shorts 📱");
        if (isShorts === false) filtered = filtered.filter((v) => v.video_type === "Long-form 📺");
        if (origin !== null) filtered = filtered.filter((v) => v.origin_type === origin);
        if (category !== null) filtered = filtered.filter((v) => v.category_name === category);
        return [...filtered]
            .sort((a, b) => getSortValue(b, sortBy) - getSortValue(a, sortBy))
            .slice(0, 20);
    }, [allVideos, isShorts, origin, category, sortBy]);

    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">

                {/* ── Header ────────────────────────────────────────── */}
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                            Live · 매시간 갱신 · {updatedAt ? parseUpdatedHour(updatedAt) : "-"} 기준
                        </span>
                    </div>
                    <div className="flex flex-col leading-none">
                        <span
                            className="text-[clamp(4rem,12vw,9rem)] leading-[0.9] tracking-tight"
                            style={{
                                fontFamily: "var(--font-bebas), sans-serif",
                                background: "linear-gradient(135deg, #FF4500 0%, #FF8C00 35%, #1A1A1A 70%, #000000 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}
                        >
                            TOP 20
                        </span>
                        <span
                            className="text-[clamp(1.5rem,5vw,3.5rem)] font-black tracking-tight leading-snug -mt-1"
                            style={{
                                fontFamily: "var(--font-noto), 'Noto Sans KR', sans-serif",
                                background: "linear-gradient(135deg, #2A2A2A 0%, #555555 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}
                        >
                            실시간 랭킹
                        </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <p className="text-base text-[#555555]">지금 이 순간, 조회수가 폭발적으로 오르고 있는 영상들</p>
                        <HomeInfoPanel />
                        <ShareButton />
                    </div>
                </div>

                {/* ── Filter Bar ────────────────────────────────────── */}
                <div className="mb-8 space-y-3.5 rounded-2xl border border-neutral-100 bg-white px-5 py-4 shadow-sm">

                    {/* Row 1: Sort */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                            정렬 기준 ▸
                        </span>
                        {([
                            { key: "hourly_views", label: "🔥 조회수 급상승" },
                            { key: "hourly_likes", label: "❤️ 좋아요 급상승" },
                            { key: "hourly_comments", label: "💬 댓글 급상승" },
                            { key: "total_views", label: "📈 누적 조회수" },
                        ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                            <Pill key={key} active={sortBy === key} onClick={() => setSortBy(key)}>{label}</Pill>
                        ))}
                    </div>

                    <div className="h-px bg-neutral-100" />

                    {/* Row 2: Filters */}
                    <div className="flex flex-col gap-3">
                        {/* Format */}
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:w-16 sm:mt-2">형식</span>
                            <div className="flex flex-wrap gap-[6px]">
                                <Pill active={isShorts === null} onClick={() => setIsShorts(null)}>전체</Pill>
                                <Pill active={isShorts === true} onClick={() => setIsShorts(true)}>📱 Shorts</Pill>
                                <Pill active={isShorts === false} onClick={() => setIsShorts(false)}>📺 Long-form</Pill>
                            </div>
                        </div>

                        {/* Origin */}
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:w-16 sm:mt-2">지역</span>
                            <div className="flex flex-wrap gap-[6px]">
                                <Pill active={origin === null} onClick={() => setOrigin(null)}>국내+해외</Pill>
                                <Pill active={origin === "DOMESTIC"} onClick={() => setOrigin("DOMESTIC")}>🇰🇷 국내</Pill>
                                <Pill active={origin === "IMPORTED"} onClick={() => setOrigin("IMPORTED")}>🌐 해외</Pill>
                            </div>
                        </div>

                        {/* Category */}
                        {categories.length > 0 && (
                            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:w-16 sm:mt-2">카테고리</span>
                                <div className="flex flex-wrap gap-[6px] flex-1">
                                    <Pill active={category === null} onClick={() => setCategory(null)}>전체</Pill>
                                    {categories.map((c) => (
                                        <Pill key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Pill>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Error UI ──────────────────────────────────────── */}
                {error && !loading && (
                    <div className="mb-6 flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center">
                        <span className="text-3xl">🚨</span>
                        <div>
                            <p className="text-sm font-semibold text-red-700">데이터를 불러오지 못했습니다</p>
                            <p className="mt-0.5 text-xs text-red-400">잠시 후 다시 시도해주세요</p>
                        </div>
                        <button
                            onClick={refetch}
                            className="rounded-full bg-red-600 px-5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-95"
                        >
                            다시 시도
                        </button>
                    </div>
                )}

                {/* ── Status ────────────────────────────────────────── */}
                {!error && !loading && (
                    <div className="mb-5">
                        <p className="text-xs font-medium text-neutral-400">{videos.length}개 영상 표시 중</p>
                    </div>
                )}

                {/* ── Grid ──────────────────────────────────────────── */}
                {loading ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <VideoCardSkeleton key={i} />
                        ))}
                    </div>
                ) : !error && videos.length === 0 ? (
                    <div className="flex h-64 items-center justify-center rounded-2xl border border-neutral-100 bg-neutral-50/50 text-sm text-neutral-400">
                        선택한 필터에 해당하는 영상이 없습니다.
                    </div>
                ) : !error ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {videos.map((video, i) => (
                            <VideoCard key={video.video_id} video={video} rank={i + 1} sortBy={sortBy} />
                        ))}
                    </div>
                ) : null}


            </main>
        </div>
    );
}
