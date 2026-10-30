"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ViralVideo } from "@/lib/viral-types";
import { RANKING_TIER_URLS, TierKey } from "@/lib/cdn";
import { isSupabase } from "@/lib/datasource";
import type { NoticeMeta } from "@/lib/notices";
import { MetricsDisclosure } from "@/components/legal";
import { track, currentPageType } from "@/lib/analytics";

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

/**
 * 해외 탭의 언어 칩.
 *
 * 나라가 아니라 오디오 언어다. 유튜브가 주는 나라 정보는 채널 주인이 스스로
 * 적는 선택 항목이라 절반 가까이 비어 있지만, 오디오 언어는 영상의 99.8% 에
 * 있다. 사용자에게는 사실상 나라 필터처럼 읽히도록 대표 지역을 함께 적는다.
 *
 * 순서는 해외 영상 비중순 (2026-09-15 실측: 영어 39%, 힌디 15%, 스페인어 4%,
 * 일본어 3.6%, 인도네시아어 3.4%, 아랍어 2.8%, 포르투갈어 2%, 러시아어 1.7%).
 * 코드는 지역 접미사를 뗀 기본 코드다 (en-US 도 en 으로 들어온다).
 */
const LANG_CHIPS: { code: string; label: string }[] = [
    { code: "en", label: "🇺🇸 영어" },
    { code: "hi", label: "🇮🇳 힌디어" },
    { code: "es", label: "🇪🇸 스페인어" },
    { code: "ja", label: "🇯🇵 일본어" },
    { code: "id", label: "🇮🇩 인도네시아어" },
    { code: "ar", label: "🇸🇦 아랍어" },
    { code: "pt", label: "🇧🇷 포르투갈어" },
    { code: "ru", label: "🇷🇺 러시아어" },
    { code: "vi", label: "🇻🇳 베트남어" },
    { code: "th", label: "🇹🇭 태국어" },
    { code: "zh", label: "🇨🇳 중국어" },
];
const LANG_CODES = new Set(LANG_CHIPS.map((c) => c.code));
/**
 * 처음에 그리는 개수.
 *
 * 데이터 출처가 GitHub 파일이던 때는 조합별 상위 50위까지만 담겨 있어서
 * 이 값이 곧 상한이었다. Supabase 로 옮기면서 컷이 사라져 한 번에 1,000건까지
 * 받아오지만, 카드 1,000개를 한꺼번에 그리면 브라우저가 버벅인다.
 * 그래서 처음에는 50개만 그리고 나머지는 '더 보기'로 펼친다.
 */
const DISPLAY_LIMIT = 50;

/** '더 보기' 한 번에 추가로 펼치는 개수. */
const PAGE_STEP = 50;

// ─── Tier Config ──────────────────────────────────────────────────────────────

const TIER_CONFIG: { key: TierKey; label: string; sub: string }[] = [
    { key: "all",   label: "전체",       sub: "" },
    { key: "tier1", label: "Tier 1",    sub: "100만+" },
    { key: "tier2", label: "Tier 2",    sub: "10~100만" },
    { key: "tier3", label: "Tier 3",    sub: "1~10만" },
    { key: "micro", label: "마이크로",   sub: "~1만" },
];

// ─── Gzip Fetch Helper (browser DecompressionStream) ─────────────────────────

async function fetchGzipJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`CDN ${res.status}`);
    // jsDelivr가 Content-Encoding:gzip 자동 적용 → 이미 decode된 경우 .json() 직접 사용
    // Content-Type이 application/gzip인 경우 수동 디코딩
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("gzip") || contentType.includes("octet-stream")) {
        const ds = new DecompressionStream("gzip");
        const decompressed = new Response(res.body!.pipeThrough(ds));
        return decompressed.json() as Promise<T>;
    }
    return res.json() as Promise<T>;
}

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
        <button type="button" onClick={onClick} aria-pressed={active} className="vh-chip">
            {active && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="vh-chip-check" aria-hidden="true">
                    <path d="M1.5 5.5L3.5 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
        <div className="vh-pop-wrap">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="vh-btn-ghost"
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
                <div className="vh-pop">
                    {/* 제목 */}
                    <h3>
                        🔥 실시간 떡상 영상 랭킹이란?
                    </h3>
                    {/* 본문 */}
                    <p>
                        채널의 체급(구독자 수)이라는 계급장을 떼고, 지금 이 순간 유튜브 알고리즘의 선택을 받아
                        가장 무섭게 터지고 있는 <strong>&apos;신규 영상&apos;</strong>들만 모아둔
                        실시간 트렌드 지표입니다.
                    </p>
                    <p>
                        지금 당장 조회수를 쓸어 담고 있는 영상의 썸네일과 제목 기획을 참고해 보세요.
                    </p>
                    {/* 닫기 */}
                    <button type="button" onClick={() => setOpen(false)} className="vh-pop-close">
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
        <div className="vh-rrow" aria-hidden="true">
            <span className="vh-th vh-skel" />
            <span className="vh-rk"><span className="vh-skel" style={{ display: "inline-block", width: 22, height: 26 }} /></span>
            <span className="vh-tt">
                <span className="vh-skel" style={{ display: "block", height: 12, width: "30%" }} />
                <span className="vh-skel" style={{ display: "block", height: 16, width: "80%" }} />
            </span>
            <span className="vh-mv"><span className="vh-skel" style={{ display: "block", height: 18, width: 72 }} /></span>
        </div>
    );
}

// ─── Video Card ────────────────────────────────────────────────────

function VideoCard({ video, rank, sortBy }: { video: ViralVideo; rank: number; sortBy: SortKey }) {
    const [imgError, setImgError] = useState(false);
    const isShorts = video.video_type === "Shorts 📱";

    // [2026-10-30 새 디자인] 카드 → 한 줄. 글·순서·링크(한 줄 전체가 영상 링크)·썸네일 alt 는 그대로 두고
    // 배치만 바꿨다. 화면 위치는 vh.css 의 .vh-rrow 격자가 정한다.
    return (
        <a
            href={`https://www.youtube.com/watch?v=${video.video_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="vh-rrow"
            data-top={rank <= 3 ? "" : undefined}
            data-wide={rank >= 100 ? "" : undefined}
        >
            {/* Thumbnail */}
            <span className="vh-th">
                {!imgError ? (
                    <Image
                        src={thumbUrl(video.video_id)}
                        alt={video.title}
                        fill
                        sizes="(max-width: 640px) 96px, 128px"
                        onError={() => setImgError(true)}
                        unoptimized
                    />
                ) : (
                    <span className="vh-th-fallback">
                        {isShorts ? "📱" : "📺"}
                    </span>
                )}
            </span>
            <span className="vh-rk">
                {rank}
            </span>
            <span className="vh-rtype">
                {video.video_type}
            </span>

            {/* Body */}
            <span className="vh-tt">
                <span className="vh-rch">
                    {video.channel_title}
                </span>
                <h3 className="vh-title">
                    {video.title}
                </h3>
            </span>
            <span className="vh-mv">
                <small>
                    {getHeroLabel(sortBy)}
                </small>
                <strong>
                    {getHeroValue(video, sortBy)}
                </strong>
            </span>
            <span className="vh-rmeta">
                <span className="vh-rtot">
                    총 {fmtKr(video.total_views, "회")} &middot; 좋아요 {fmtKr(video.total_likes)} &middot; 댓글 {fmtKr(video.total_comments)}
                </span>
                {video.category_name && (
                    <span className="vh-rtag">
                        {video.category_name}
                    </span>
                )}
                <span className="vh-rtag">
                    {video.origin_type === "DOMESTIC" ? "🇰🇷 국내" : "🌐 해외"}
                </span>
            </span>
        </a>
    );
}

// ─── Share Button ─────────────────────────────────────────────────────────────

function ShareButton() {
    const [copied, setCopied] = useState(false);
    function handleCopy() {
        track("share", { page_type: currentPageType() });
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }
    return (
        <button
            onClick={handleCopy}
            title="현재 필터 URL 복사"
            className="vh-btn-ghost"
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
    latestNotice,
}: {
    initialVideos: ViralVideo[];
    allVideos: ViralVideo[];
    categories: string[];
    updatedAt: string;
    latestNotice?: NoticeMeta | null;
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
    // 기본값은 국내다. "한국 유튜브 트렌드"를 표방하는데 전체 기준으로 세우면
    // 상위가 해외로만 채워지기 때문이다(2026-08-04 실측: TOP 50 이 50개 모두 해외).
    // 그래서 파라미터가 없으면 국내로 보고, 전체를 보려면 region=전체 를 명시한다.
    // 기존에 쓰이던 region=국내 / region=해외 링크는 그대로 동작한다.
    function initOrigin(): OriginState {
        const v = searchParams.get("region");
        if (v === "전체" || v === "ALL") return null;
        if (v === "해외" || v === "IMPORTED") return "IMPORTED";
        return "DOMESTIC";
    }
    function initTier(): TierKey {
        const v = searchParams.get("tier");
        if (v === "tier1" || v === "tier2" || v === "tier3" || v === "micro") return v;
        return "all";
    }

    // 언어는 해외일 때만 의미가 있다. 국내 링크에 lang 이 붙어 있으면 무시한다.
    function initLang(): string | null {
        const v = searchParams.get("lang");
        return v && LANG_CODES.has(v) && initOrigin() === "IMPORTED" ? v : null;
    }

    const [sortBy, setSortByState] = useState<SortKey>(initSortBy);
    const [isShorts, setIsShortsState] = useState<ShortsState>(initIsShorts);
    const [origin, setOriginState] = useState<OriginState>(initOrigin);
    const [lang, setLangState] = useState<string | null>(initLang);
    const [category, setCategoryState] = useState<string | null>(searchParams.get("category"));
    const [tier, setTierState] = useState<TierKey>(initTier);
    // 지금 몇 개까지 그릴지. 필터를 바꾸면 다시 처음부터 본다(아래 useEffect).
    const [visibleCount, setVisibleCount] = useState(DISPLAY_LIMIT);

    // ── URL 업데이트 헬퍼 ────────────────────────────────────────────────────
    const syncUrl = useCallback((updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([k, v]) => {
            if (v === null) params.delete(k); else params.set(k, v);
        });
        const qs = params.toString();
        router.push(qs ? `?${qs}` : "?", { scroll: false });
        // 필터 버튼은 모두 이 함수를 거친다. 첫 키가 누른 필터다
        // (지역을 바꿀 때 같이 지워지는 lang 은 세지 않는다). null 은 기본값으로 돌아간 것.
        const [name, value] = Object.entries(updates)[0] ?? [];
        if (name) track("filter_change", { board: "ranking", filter_name: name, filter_value: value ?? "default" });
    }, [router, searchParams]);

    function setSortBy(v: SortKey) { setSortByState(v); syncUrl({ sort: v === "hourly_views" ? null : v }); }
    function setIsShorts(v: ShortsState) { setIsShortsState(v); syncUrl({ format: v === true ? "Shorts" : v === false ? "Long-form" : null }); }
    // 기본값(국내)일 때 파라미터를 지워 URL 을 깨끗하게 유지한다.
    // 해외를 벗어나면 언어 선택도 함께 지운다. 국내 탭에 "일본어" 가 남아
    // 있으면 결과가 비는데 이유가 화면에 안 보인다.
    function setOrigin(v: OriginState) {
        setOriginState(v);
        const leavingImported = v !== "IMPORTED";
        if (leavingImported) setLangState(null);
        syncUrl({
            region: v === "DOMESTIC" ? null : v === "IMPORTED" ? "해외" : "전체",
            ...(leavingImported && { lang: null }),
        });
    }
    function setLang(v: string | null) { setLangState(v); syncUrl({ lang: v }); }
    function setCategory(v: string | null) { setCategoryState(v); syncUrl({ category: v }); }
    function setTier(v: TierKey) { setTierState(v); syncUrl({ tier: v === "all" ? null : v }); }

    // ── 구독자 구간별 CDN fetch (tier 변경시 재요청) ─────────────────────────
    const [allVideos, setAllVideos] = useState<ViralVideo[]>(initialVideos);
    const [categories, setCategories] = useState<string[]>(initialCategories);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 필터를 빠르게 연달아 누르면 앞 요청의 응답이 늦게 도착해 최신 결과를 덮을 수 있다.
    // 마지막 요청의 응답만 반영한다.
    const requestSeq = useRef(0);

    const refetch = useCallback(() => {
        const seq = ++requestSeq.current;
        setLoading(true);
        setError(null);
        // 데이터 출처 스위치. 기본값은 기존과 같은 GitHub gzip 파일이고,
        // NEXT_PUBLIC_DATA_SOURCE=supabase 일 때만 API 라우트를 거친다.
        //
        // GitHub 파일은 조합별 상위 50위만 담고 있어 전체의 12% 뿐이지만,
        // Supabase 경로는 컷이 없어 limit 만큼 깊이 가져올 수 있다.
        // 응답 형태가 같아서 아래 처리는 양쪽 모두 그대로 동작한다.
        //
        // 지역을 서버에 넘기는 이유: 시간당 증가 상위는 해외가 압도한다.
        // 실측으로 상위 1,000건 중 해외가 943건(94%)이라, 지역 구분 없이 받아
        // 화면에서 걸러내면 국내는 57건만 남는다. 없앴던 50위 컷이 사실상
        // 되살아나는 셈이라 서버에서 걸러야 한다. (GitHub 파일은 조합별로
        // 미리 잘라둔 구조라 이 문제가 없었다)
        // 언어도 같은 이유로 서버에서 거른다. 해외 상위 1,000건은 영어·힌디가
        // 절반이라 화면에서 걸러내면 일본어 같은 언어는 몇 건 안 남는다.
        // [2026-10-16] 형식·카테고리·정렬도 서버로 넘긴다. 1,000건을 받아 화면에서
        // 거르면 1,000건 밖의 영상은 카테고리를 골라도 나오지 않았다
        // (국내 Education 339건 중 24건만 보임). 조합마다 그 안의 상위 1,000건을 받는다.
        // 아래 화면 쪽 필터·정렬은 그대로 둔다 — 서버 결과에는 영향이 없고,
        // 새 응답이 오기 전까지 들고 있는 목록을 바로 걸러 보여준다.
        const source = isSupabase
            ? `/api/ranking?tier=${tier}&limit=1000` +
              (origin ? `&origin=${origin}` : "") +
              (origin === "IMPORTED" && lang ? `&lang=${lang}` : "") +
              (isShorts === true ? "&format=Shorts" : isShorts === false ? "&format=Long-form" : "") +
              (category ? `&category=${encodeURIComponent(category)}` : "") +
              (sortBy !== "hourly_views" ? `&sort=${sortBy}` : "")
            : RANKING_TIER_URLS[tier];

        fetchGzipJson<ViralVideo[]>(source)
            .then((data) => {
                if (seq !== requestSeq.current) return;
                setAllVideos(data);
                // 카테고리 목록은 합집합으로 유지한다. 지역으로 걸러 받으면
                // 그 지역에 없는 카테고리가 목록에서 사라지는데, 사용자가
                // 지역을 바꿨을 때 선택지가 없어지면 안 된다.
                setCategories((prev) => {
                    const set = new Set(prev);
                    for (const v of data) if (v.category_name) set.add(v.category_name);
                    return Array.from(set).sort();
                });
            })
            .catch((e) => { if (seq === requestSeq.current) setError(e.message); })
            .finally(() => { if (seq === requestSeq.current) setLoading(false); });
    }, [tier, origin, lang, isShorts, category, sortBy]);

    useEffect(() => { refetch(); }, [refetch]);

    // 집계 시각은 SSR 이 넘겨준 값이 아니라 지금 들고 있는 데이터에서 읽는다.
    // SSR 값만 쓰면 탭을 열어 둔 채 필터를 바꿔 새 데이터를 받아도 라벨은
    // 처음 시각에 머물러, 10시 데이터 위에 "7시 집계"가 떠 있게 된다.
    const liveUpdatedAt = allVideos[0]?.updated_at || updatedAt;


    // ── 클라이언트 사이드 필터 + 정렬 (재쿼리 없음) ────────────────────────────
    // 조건에 맞는 '전체' 목록. 화면에 몇 개를 그릴지는 아래 videos 가 정한다.
    const matched = useMemo(() => {
        let filtered = allVideos;
        if (isShorts === true) filtered = filtered.filter((v) => v.video_type === "Shorts 📱");
        if (isShorts === false) filtered = filtered.filter((v) => v.video_type === "Long-form 📺");
        if (origin !== null) filtered = filtered.filter((v) => v.origin_type === origin);
        if (category !== null) filtered = filtered.filter((v) => v.category_name === category);
        return [...filtered].sort((a, b) => getSortValue(b, sortBy) - getSortValue(a, sortBy));
    }, [allVideos, isShorts, origin, category, sortBy]);

    // 실제로 그리는 것만 잘라낸다.
    const videos = useMemo(
        () => matched.slice(0, visibleCount),
        [matched, visibleCount],
    );

    // 필터·정렬을 바꾸면 목록의 성격이 달라지므로 다시 처음부터 보여준다.
    // (200개를 펼쳐둔 상태에서 카테고리를 바꾸면 엉뚱하게 200개가 그대로 보인다)
    useEffect(() => {
        setVisibleCount(DISPLAY_LIMIT);
    }, [isShorts, origin, lang, category, sortBy, tier]);

    return (
        /* [2026-10-30 새 디자인] 글·순서·링크는 main 그대로 두고 모양만 바꿨다 (SEO: 순위 화면은 2단계 때 글을 바꾼다). */
        <main className="vh-main">

            {/* ── Header ────────────────────────────────────────── */}
            <div className="vh-rhead">
                <p className="vh-live">
                    <span className="vh-live-dot" />
                    {/* '기준'만 쓰면 그 시각의 실시간 값으로 오해하기 쉬워 'N시 집계'로 쓴다.
                        [2026-10-31] 옆에 붙어 있던 '매시 25분경 갱신'은 사용자 요청으로 뺐다
                        (채널 등급 추적을 끈 뒤 적재가 4~5분경으로 당겨져 틀린 말이 됐다). */}
                    {/* 지역 범위는 아래 필터 pill 이 활성 상태로 이미 보여주므로
                        여기 중복 표기하지 않는다. */}
                    <span>
                        Live · {liveUpdatedAt ? parseUpdatedHour(liveUpdatedAt) : "-"} 집계
                    </span>
                </p>
                {/* [2026-10-16] 이 페이지에 h1 이 하나도 없었다(div+span). 검색엔진이
                    페이지 주제를 읽는 1순위 요소라 h1 으로 바꾸고, 사람들이 실제로
                    검색하는 표현('유튜브 실시간 급상승 순위')을 담는다.
                    'TOP 50'은 50개만 보이던 시절 이름이라 최대치인 1000으로. */}
                <h1>
                    <span className="vh-top1000">
                        TOP 1000
                    </span>
                    <span className="vh-h1-sub">
                        유튜브 실시간 급상승 순위
                    </span>
                </h1>
                <div className="vh-tools">
                    <p className="vh-lead">
                        지금 조회수가 가장 빠르게 오르는 유튜브 동영상을 최대 1,000위까지 · 쇼츠·롱폼, 카테고리, 구독자 구간별로 골라 보세요
                    </p>
                    <HomeInfoPanel />
                    <ShareButton />
                </div>
                {/* YouTube API 정책 III.E.4.h: 자체 계산 지표 고지 */}
                <MetricsDisclosure />
            </div>

            {/* ── Latest Notice Banner ─────────────────────────── */}
            {latestNotice && (
                <a href={`/notice/${latestNotice.slug}`} className="vh-notice">
                    <span className="vh-notice-ic">📢</span>
                    <span className="vh-notice-tag">
                        [{latestNotice.date.replace(/-/g, ".")}]
                    </span>
                    <span className="vh-notice-title">
                        {latestNotice.title}
                    </span>
                    <span className="vh-notice-go">
                        자세히 →
                    </span>
                </a>
            )}

            {/* ── Filter Bar ────────────────────────────────────── */}
            <div className="vh-card vh-rfilters">

                {/* Row 1: Sort */}
                <div className="vh-filter-row">
                    <span>
                        정렬 기준 ▸
                    </span>
                    <div className="vh-chips">
                        {([
                            { key: "hourly_views", label: "🔥 조회수 급상승" },
                            { key: "hourly_likes", label: "❤️ 좋아요 급상승" },
                            { key: "hourly_comments", label: "💬 댓글 급상승" },
                            { key: "total_views", label: "📈 누적 조회수" },
                        ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                            <Pill key={key} active={sortBy === key} onClick={() => setSortBy(key)}>{label}</Pill>
                        ))}
                    </div>
                </div>

                <div className="vh-rfilters-line" />

                {/* Row 2: Filters */}
                {/* Format */}
                <div className="vh-filter-row">
                    <span>형식</span>
                    <div className="vh-chips">
                        <Pill active={isShorts === null} onClick={() => setIsShorts(null)}>전체</Pill>
                        <Pill active={isShorts === true} onClick={() => setIsShorts(true)}>📱 Shorts</Pill>
                        <Pill active={isShorts === false} onClick={() => setIsShorts(false)}>📺 Long-form</Pill>
                    </div>
                </div>

                {/* Origin */}
                <div className="vh-filter-row">
                    <span>지역</span>
                    <div className="vh-chips">
                        {/* 기본값인 국내를 맨 앞에 둔다 */}
                        <Pill active={origin === "DOMESTIC"} onClick={() => setOrigin("DOMESTIC")}>🇰🇷 국내</Pill>
                        <Pill active={origin === "IMPORTED"} onClick={() => setOrigin("IMPORTED")}>🌐 해외</Pill>
                        <Pill active={origin === null} onClick={() => setOrigin(null)}>국내+해외</Pill>
                    </div>
                </div>

                {/* Language — 해외를 골랐을 때만. 국내는 한국어 하나라 칩이 의미 없다. */}
                {origin === "IMPORTED" && isSupabase && (
                    <div className="vh-filter-row">
                        <span>언어</span>
                        <div className="vh-chips">
                            <Pill active={lang === null} onClick={() => setLang(null)}>전체</Pill>
                            {LANG_CHIPS.map(({ code, label }) => (
                                <Pill key={code} active={lang === code} onClick={() => setLang(code)}>{label}</Pill>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tier (구독자 구간) */}
                <div className="vh-filter-row">
                    <span>구독자</span>
                    <div className="vh-chips">
                        {TIER_CONFIG.map(({ key, label, sub }) => (
                            <Pill key={key} active={tier === key} onClick={() => setTier(key)}>
                                {label}
                                {sub && (
                                    <small>{sub}</small>
                                )}
                            </Pill>
                        ))}
                    </div>
                </div>

                {/* Category */}
                {categories.length > 0 && (
                    <div className="vh-filter-row">
                        <span>카테고리</span>
                        <div className="vh-chips">
                            <Pill active={category === null} onClick={() => setCategory(null)}>전체</Pill>
                            {categories.map((c) => (
                                <Pill key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Pill>
                            ))}
                        </div>
                        {/* [2026-10-01] 카테고리는 유튜브가 내용을 보고 정한 값이 아니라 업로더가
                            고른 값이다. 채널 기본값을 'Music' 으로 둔 쇼츠 채널이 많아 야구·콩트
                            영상이 Music 에 섞여 보인다는 문의가 있었다. 우리가 재분류하지 않고
                            출처를 밝힌다. */}
                        <p className="vh-filter-note">
                            카테고리는 영상을 올린 사람이 직접 지정한 유튜브 카테고리 기준입니다.
                            그래서 내용과 다른 카테고리에 들어간 영상이 있을 수 있어요.
                        </p>
                    </div>
                )}
            </div>

            {/* ── Error UI ──────────────────────────────────────── */}
            {error && !loading && (
                <div className="vh-error">
                    <span className="vh-error-ic">🚨</span>
                    <div>
                        <b>데이터를 불러오지 못했습니다</b>
                        <p>잠시 후 다시 시도해주세요</p>
                    </div>
                    <button type="button" onClick={refetch}>
                        다시 시도
                    </button>
                </div>
            )}

            {/* ── Status ────────────────────────────────────────── */}
            {!error && !loading && (
                <div>
                    {/* 전체가 몇 개인지 함께 보여준다. 예전에는 50위가 상한이라
                        '50개 표시 중'이 곧 전부였지만, 이제는 더 있다는 걸 알려야 한다. */}
                    <p className="vh-count">
                        {matched.length > videos.length
                            ? `${matched.length.toLocaleString()}개 중 ${videos.length}개 표시 중`
                            : `${videos.length}개 영상 표시 중`}
                    </p>
                </div>
            )}

            {/* ── Grid ──────────────────────────────────────────── */}
            {loading ? (
                <div className="vh-list vh-rlist">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <VideoCardSkeleton key={i} />
                    ))}
                </div>
            ) : !error && videos.length === 0 ? (
                <div className="vh-empty">
                    선택한 필터에 해당하는 영상이 없습니다.
                </div>
            ) : !error ? (
                <>
                    <div className="vh-list vh-rlist">
                        {videos.map((video, i) => (
                            <VideoCard key={video.video_id} video={video} rank={i + 1} sortBy={sortBy} />
                        ))}
                    </div>

                    {/* 더 보기 — 데이터는 이미 받아둔 상태라 클릭 즉시 펼쳐진다(추가 요청 없음). */}
                    {matched.length > videos.length && (
                        <div className="vh-loadmore">
                            <button
                                type="button"
                                onClick={() => setVisibleCount((n) => n + PAGE_STEP)}
                            >
                                더 보기 (+{Math.min(PAGE_STEP, matched.length - videos.length)})
                            </button>
                            <p>
                                {(matched.length - videos.length).toLocaleString()}개 더 있습니다
                            </p>
                        </div>
                    )}
                </>
            ) : null}


        </main>
    );
}
