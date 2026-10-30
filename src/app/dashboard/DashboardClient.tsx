"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ViralVideo } from "@/lib/viral-types";
import { RANKING_TIER_URLS, TierKey } from "@/lib/cdn";
import { isSupabase } from "@/lib/datasource";
import type { NoticeMeta } from "@/lib/notices";
import { MetricsDisclosure } from "@/components/legal";
import { track, currentPageType } from "@/lib/analytics";

/*
 * [2026-10-30 새 디자인] 카드 격자 → 한 줄 목록(순위 숫자·썸네일·제목·최근 1시간).
 * 휴대폰에서 영상 하나가 화면을 거의 다 쓰던 것(50개에 약 2만 6천 px)을 줄인다.
 * 필터·정렬·언어·구독자 구간·더 보기·공유·GA(filter_change, share)는 그대로다.
 * 필터는 지역·형식·정렬만 밖에 두고 나머지는 '필터' 안으로 접는다(점진적 공개).
 */

// ─── updatedAt 파싱: '2026-03-31-10' 또는 HH:MM → 10
function parseUpdatedHour(raw: string): number | null {
    const dashMatch = raw.match(/(\d{4}-\d{2}-\d{2})-(\d{1,2})$/);
    if (dashMatch) return parseInt(dashMatch[2], 10);
    const colonMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (colonMatch) return parseInt(colonMatch[1], 10);
    const hourMatch = raw.match(/^(\d{1,2})시$/);
    if (hourMatch) return parseInt(hourMatch[1], 10);
    return null;
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
 * 있다. 순서는 해외 영상 비중순 (2026-09-15 실측: 영어 39%, 힌디 15%, 스페인어 4%,
 * 일본어 3.6%, 인도네시아어 3.4%, 아랍어 2.8%, 포르투갈어 2%, 러시아어 1.7%).
 * 코드는 지역 접미사를 뗀 기본 코드다 (en-US 도 en 으로 들어온다).
 * [2026-10-30] 국기 이모지는 윈도우에서 'US' 같은 글자로 보여 뺐다.
 */
const LANG_CHIPS: { code: string; label: string }[] = [
    { code: "en", label: "영어" },
    { code: "hi", label: "힌디어" },
    { code: "es", label: "스페인어" },
    { code: "ja", label: "일본어" },
    { code: "id", label: "인도네시아어" },
    { code: "ar", label: "아랍어" },
    { code: "pt", label: "포르투갈어" },
    { code: "ru", label: "러시아어" },
    { code: "vi", label: "베트남어" },
    { code: "th", label: "태국어" },
    { code: "zh", label: "중국어" },
];
const LANG_CODES = new Set(LANG_CHIPS.map((c) => c.code));

/** 유튜브 카테고리(업로더가 고른 영문 값) → 화면 이름. 서버로 넘기는 값은 영문 그대로다. */
const CATEGORY_KO: Record<string, string> = {
    "Autos & Vehicles": "자동차",
    Comedy: "코미디",
    Education: "교육",
    Entertainment: "엔터테인먼트",
    "Film & Animation": "영화·애니",
    Gaming: "게임",
    "Howto & Style": "노하우·스타일",
    Music: "음악",
    "News & Politics": "뉴스·정치",
    "Nonprofits & Activism": "비영리·사회",
    "People & Blogs": "인물·블로그",
    "Pets & Animals": "동물",
    "Science & Technology": "과학·기술",
    Sports: "스포츠",
    "Travel & Events": "여행",
};
const categoryKo = (c: string) => CATEGORY_KO[c] ?? c;

/**
 * 처음에 그리는 개수. 한 번에 1,000건까지 받지만, 처음에는 50개만 그리고
 * 나머지는 '더 보기'로 펼친다.
 */
const DISPLAY_LIMIT = 50;

/** '더 보기' 한 번에 추가로 펼치는 개수. */
const PAGE_STEP = 50;

// ─── Tier Config ──────────────────────────────────────────────────────────────
// 화면에는 'Tier 1' 대신 구독자 범위를 그대로 적는다. 키(sub_tier)는 그대로다.
const TIER_CONFIG: { key: TierKey; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "tier1", label: "100만 이상" },
    { key: "tier2", label: "10만~100만" },
    { key: "tier3", label: "1만~10만" },
    { key: "micro", label: "1만 미만" },
];

const SORTS: { key: SortKey; label: string; valueLabel: string }[] = [
    { key: "hourly_views", label: "조회수 급상승", valueLabel: "최근 1시간 조회수" },
    { key: "hourly_likes", label: "좋아요 급상승", valueLabel: "최근 1시간 좋아요" },
    { key: "hourly_comments", label: "댓글 급상승", valueLabel: "최근 1시간 댓글" },
    { key: "total_views", label: "누적 조회수", valueLabel: "누적 조회수" },
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

/** 숫자와 단위를 나눠 단위만 작게 그린다 ('33.2' + '만') */
function Kr({ n, prefix = "", unit = "" }: { n: number; prefix?: string; unit?: string }) {
    const t = fmtKr(n);
    const m = t.match(/^([\d.,]+)(.*)$/);
    const num = m ? m[1] : t;
    const u = (m ? m[2] : "") + unit;
    return (
        <>
            {prefix}
            {num}
            {u && <span className="vh-u">{u}</span>}
        </>
    );
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

// ─── 순위 산정 방식 (짧은 설명) ───────────────────────────────────────────────

function HomeInfoPanel() {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ position: "relative" }}>
            <button type="button" className="vh-btn-ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
                이 순위는 무엇인가요? <span aria-hidden="true">{open ? "▴" : "▾"}</span>
            </button>
            {open && (
                <div className="vh-pop">
                    <h3>지금 뜨는 영상 순위란?</h3>
                    <p>
                        채널의 체급(구독자 수)이라는 계급장을 떼고, 지금 이 순간 유튜브 알고리즘의 선택을 받아 가장 무섭게 터지고 있는
                        <strong> 새 영상</strong>들만 모아 둔 실시간 트렌드 지표입니다.
                    </p>
                    <p>지금 당장 조회수를 쓸어 담고 있는 영상의 썸네일과 제목 기획을 참고해 보세요. 자세한 기준은 아래 &lsquo;이 순위는 이렇게 매깁니다&rsquo;에 있어요.</p>
                    <button type="button" className="vh-btn-ghost" style={{ marginTop: 12 }} onClick={() => setOpen(false)}>
                        닫기
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Row Skeleton ─────────────────────────────────────────────────────────────

function RowSkeleton() {
    return (
        <li className="vh-row" aria-hidden="true">
            <span className="vh-skel" style={{ width: 28, height: 28, justifySelf: "center" }} />
            <span className="vh-skel" style={{ aspectRatio: "16 / 9", width: "100%" }} />
            <span style={{ display: "grid", gap: 8 }}>
                <span className="vh-skel" style={{ height: 14, width: "80%" }} />
                <span className="vh-skel" style={{ height: 12, width: "45%" }} />
            </span>
            <span className="vh-skel" style={{ height: 18, width: 72 }} />
        </li>
    );
}

// ─── 순위 한 줄 ───────────────────────────────────────────────────────────────

function RankRow({ video, rank, sortBy, showOrigin }: { video: ViralVideo; rank: number; sortBy: SortKey; showOrigin: boolean }) {
    const [imgError, setImgError] = useState(false);
    const isShorts = video.video_type === "Shorts 📱";
    const url = `https://www.youtube.com/watch?v=${video.video_id}`;
    const sort = SORTS.find((s) => s.key === sortBy)!;
    const value = getSortValue(video, sortBy);

    return (
        <li className="vh-row" data-top={rank <= 3 ? "" : undefined} data-wide={rank >= 100 ? "" : undefined}>
            <span className="vh-rk">{rank}</span>
            <a className="vh-th" href={url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
                {!imgError && (
                    <Image
                        src={thumbUrl(video.video_id)}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 96px, 128px"
                        onError={() => setImgError(true)}
                        unoptimized
                    />
                )}
                {isShorts && <span className="vh-th-tag">쇼츠</span>}
            </a>
            <div className="vh-tt">
                <a className="vh-title" href={url} target="_blank" rel="noopener noreferrer">
                    {video.title}
                </a>
                <div className="vh-meta">
                    <b>{video.channel_title}</b>
                    <span>{isShorts ? "쇼츠" : "롱폼"}</span>
                    {video.category_name && <span>{categoryKo(video.category_name)}</span>}
                    {showOrigin && <span>{video.origin_type === "DOMESTIC" ? "국내" : "해외"}</span>}
                    <span className="vh-meta-extra">
                        총 {fmtKr(video.total_views, "회")} · 좋아요 {fmtKr(video.total_likes)} · 댓글 {fmtKr(video.total_comments)}
                    </span>
                </div>
            </div>
            <div className="vh-mv">
                <strong>
                    <Kr n={value} prefix={sortBy === "total_views" ? "" : "+"} unit={sortBy === "total_views" ? "회" : ""} />
                </strong>
                <small>{sort.valueLabel}</small>
            </div>
        </li>
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
        <button type="button" className="vh-btn-ghost" onClick={handleCopy} title="현재 필터 그대로 링크 복사">
            {copied ? "링크 복사됨" : "공유"}
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

    // ── 데이터 받기 (필터가 바뀌면 다시) ─────────────────────────────────────
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
        // 지역·언어·형식·카테고리·정렬은 서버에서 거른다. 시간당 증가 상위는 해외가 압도해서
        // (상위 1,000건 중 해외 94%) 화면에서 거르면 국내가 몇 건 안 남는다.
        // 조합마다 그 안의 상위 1,000건을 받는다 ([2026-10-16]).
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
                // 카테고리 목록은 합집합으로 유지한다. 지역을 바꿨을 때 선택지가 없어지면 안 된다.
                setCategories((prev) => {
                    const set = new Set(prev);
                    for (const v of data) if (v.category_name) set.add(v.category_name);
                    return Array.from(set).sort((a, b) => categoryKo(a).localeCompare(categoryKo(b), "ko"));
                });
            })
            .catch((e) => { if (seq === requestSeq.current) setError(e.message); })
            .finally(() => { if (seq === requestSeq.current) setLoading(false); });
    }, [tier, origin, lang, isShorts, category, sortBy]);

    useEffect(() => { refetch(); }, [refetch]);

    // 집계 시각은 SSR 이 넘겨준 값이 아니라 지금 들고 있는 데이터에서 읽는다.
    // SSR 값만 쓰면 탭을 열어 둔 채 필터를 바꿔 새 데이터를 받아도 라벨이 처음 시각에 머문다.
    const liveHour = parseUpdatedHour(allVideos[0]?.updated_at || updatedAt);

    // ── 화면 쪽 필터 + 정렬 (재쿼리 없음) ───────────────────────────────────
    const matched = useMemo(() => {
        let filtered = allVideos;
        if (isShorts === true) filtered = filtered.filter((v) => v.video_type === "Shorts 📱");
        if (isShorts === false) filtered = filtered.filter((v) => v.video_type === "Long-form 📺");
        if (origin !== null) filtered = filtered.filter((v) => v.origin_type === origin);
        if (category !== null) filtered = filtered.filter((v) => v.category_name === category);
        return [...filtered].sort((a, b) => getSortValue(b, sortBy) - getSortValue(a, sortBy));
    }, [allVideos, isShorts, origin, category, sortBy]);

    const videos = useMemo(() => matched.slice(0, visibleCount), [matched, visibleCount]);

    // 필터·정렬을 바꾸면 목록의 성격이 달라지므로 다시 처음부터 보여준다.
    useEffect(() => {
        setVisibleCount(DISPLAY_LIMIT);
    }, [isShorts, origin, lang, category, sortBy, tier]);

    // '필터' 안에 접힌 조건이 몇 개 걸려 있는지 (밖에서도 보이게)
    const hiddenActive = (tier !== "all" ? 1 : 0) + (category ? 1 : 0) + (lang ? 1 : 0);

    return (
        <main className="vh-main">
            {/* ── 머리 ─────────────────────────────────────────────── */}
            <div className="vh-rhead">
                {/* 수집이 매시 정각에 시작해 20분쯤 걸리므로 N시 데이터는 N시 25분경에 나타난다. */}
                <p className="vh-eyebrow">
                    <span className="vh-live-dot" aria-hidden="true" />
                    {liveHour !== null ? `${liveHour}시 집계 · 다음 갱신 ${(liveHour + 1) % 24}:25 무렵` : "매시 25분경 갱신"}
                </p>
                {/* [2026-10-16] h1 은 사람들이 실제로 검색하는 표현('유튜브 실시간 급상승 순위')을 담는다. 문구는 그대로 둔다. */}
                <h1>
                    <span className="vh-top1000">TOP 1000</span>
                    <span className="vh-h1-sub">유튜브 실시간 급상승 순위</span>
                </h1>
                <p className="vh-lead">
                    지금 조회수가 가장 빠르게 오르는 유튜브 동영상을 최대 1,000위까지 · 쇼츠·롱폼, 카테고리, 구독자 구간별로 골라 보세요
                </p>
                <div className="vh-tools">
                    <HomeInfoPanel />
                    <ShareButton />
                </div>
                {/* YouTube API 정책 III.E.4.h: 자체 계산 지표 고지 */}
                <MetricsDisclosure />
            </div>

            {/* ── 최신 공지 ─────────────────────────────────────────── */}
            {latestNotice && (
                <a href={`/notice/${latestNotice.slug}`} className="vh-notice">
                    <span className="vh-notice-tag">공지 {latestNotice.date.slice(5).replace("-", ".")}</span>
                    <span className="vh-notice-title">{latestNotice.title}</span>
                    <span className="vh-notice-go">자세히 →</span>
                </a>
            )}

            {/* ── 필터: 지역·형식·정렬은 밖에, 나머지는 '필터' 안에 ────────────────── */}
            <div className="vh-controls">
                <div className="vh-tabs" role="group" aria-label="지역">
                    {/* 기본값인 국내를 맨 앞에 둔다 */}
                    <button type="button" aria-pressed={origin === "DOMESTIC"} onClick={() => setOrigin("DOMESTIC")}>국내</button>
                    <button type="button" aria-pressed={origin === "IMPORTED"} onClick={() => setOrigin("IMPORTED")}>해외</button>
                    <button type="button" aria-pressed={origin === null} onClick={() => setOrigin(null)}>국내+해외</button>
                </div>
                <div className="vh-seg" role="group" aria-label="형식">
                    <button type="button" aria-pressed={isShorts === null} onClick={() => setIsShorts(null)}>전체</button>
                    <button type="button" aria-pressed={isShorts === true} onClick={() => setIsShorts(true)}>쇼츠</button>
                    <button type="button" aria-pressed={isShorts === false} onClick={() => setIsShorts(false)}>롱폼</button>
                </div>
                <label className="vh-select">
                    정렬
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
                        {SORTS.map((s) => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                    </select>
                </label>
                <details className="vh-filter">
                    <summary>
                        필터{hiddenActive > 0 && <span className="vh-filter-count">{hiddenActive}</span>}
                        <span aria-hidden="true">▾</span>
                    </summary>
                    <div className="vh-filter-body">
                        <div className="vh-filter-row">
                            <span>구독자</span>
                            <div className="vh-chips">
                                {TIER_CONFIG.map(({ key, label }) => (
                                    <button key={key} type="button" className="vh-chip" aria-pressed={tier === key} onClick={() => setTier(key)}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* 언어 — 해외를 골랐을 때만. 국내는 한국어 하나라 칩이 의미 없다. */}
                        {origin === "IMPORTED" && isSupabase && (
                            <div className="vh-filter-row">
                                <span>언어</span>
                                <div className="vh-chips">
                                    <button type="button" className="vh-chip" aria-pressed={lang === null} onClick={() => setLang(null)}>전체</button>
                                    {LANG_CHIPS.map(({ code, label }) => (
                                        <button key={code} type="button" className="vh-chip" aria-pressed={lang === code} onClick={() => setLang(code)}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {categories.length > 0 && (
                            <div className="vh-filter-row">
                                <span>카테고리</span>
                                <div className="vh-chips">
                                    <button type="button" className="vh-chip" aria-pressed={category === null} onClick={() => setCategory(null)}>전체</button>
                                    {categories.map((c) => (
                                        <button key={c} type="button" className="vh-chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
                                            {categoryKo(c)}
                                        </button>
                                    ))}
                                </div>
                                {/* [2026-10-01] 카테고리는 업로더가 고른 값이다. 우리가 재분류하지 않고 출처를 밝힌다. */}
                                <p className="vh-filter-note">
                                    카테고리는 영상을 올린 사람이 직접 지정한 유튜브 카테고리 기준입니다. 그래서 내용과 다른 카테고리에 들어간 영상이 있을 수 있어요.
                                </p>
                            </div>
                        )}
                    </div>
                </details>
            </div>

            {/* ── 오류 ─────────────────────────────────────────────── */}
            {error && !loading && (
                <div className="vh-error" role="alert">
                    <b>데이터를 불러오지 못했어요</b>
                    <span className="vh-count">잠시 후 다시 시도해 주세요</span>
                    <button type="button" onClick={refetch}>다시 시도</button>
                </div>
            )}

            {/* ── 개수 ─────────────────────────────────────────────── */}
            {!error && !loading && (
                <p className="vh-count">
                    {matched.length > videos.length
                        ? `${matched.length.toLocaleString()}개 중 ${videos.length}개 표시 중`
                        : `${videos.length}개 영상 표시 중`}
                </p>
            )}

            {/* ── 목록 ─────────────────────────────────────────────── */}
            {loading ? (
                <ol className="vh-list" aria-busy="true">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <RowSkeleton key={i} />
                    ))}
                </ol>
            ) : !error && videos.length === 0 ? (
                <div className="vh-empty">선택한 필터에 해당하는 영상이 없어요.</div>
            ) : !error ? (
                <>
                    <ol className="vh-list">
                        {videos.map((video, i) => (
                            <RankRow key={video.video_id} video={video} rank={i + 1} sortBy={sortBy} showOrigin={origin === null} />
                        ))}
                    </ol>

                    {/* 더 보기 — 데이터는 이미 받아둔 상태라 클릭 즉시 펼쳐진다(추가 요청 없음). */}
                    {matched.length > videos.length && (
                        <div className="vh-loadmore">
                            <button type="button" onClick={() => setVisibleCount((n) => n + PAGE_STEP)}>
                                {videos.length + 1}위부터 더 보기 (+{Math.min(PAGE_STEP, matched.length - videos.length)})
                            </button>
                            <small>{(matched.length - videos.length).toLocaleString()}개 더 있어요</small>
                        </div>
                    )}
                </>
            ) : null}
        </main>
    );
}
