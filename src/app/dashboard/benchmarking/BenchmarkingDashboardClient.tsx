"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { TierChannel, NEW_CHANNEL_DAYS, channelAgeDays } from "@/lib/tier-channel-types";
import { ChannelBentoCard } from "@/components/dashboard/ChannelBentoCard";
import { CHANNELS_URL } from "@/lib/cdn";
import { isSupabase } from "@/lib/datasource";
import { MetricsDisclosure } from "@/components/legal";
import { track, currentPageType } from "@/lib/analytics";

// ─── targetDate 포맷터: '2026-03-31' → '2026.03.31'
function formatTargetDate(d: string | null): string {
    if (!d) return "업데이트 중";
    return d.replace(/-/g, ".");
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "avg_daily_view_increase" | "avg_daily_sub_increase" | "damped_score";
type LeagueState = null | string;
type OriginState = null | string;

/**
 * 구독자 규모 필터.
 *
 * [2026-10-14] 전에는 여기에 'Tier 1/2/3' 필터가 있었다. 그 티어는 바이럴 점수 순위
 * (리그별 상위 375 / 1,000 / 2,000위)로 정한 '재수집 주기' 등급인데, 랭킹 페이지의
 * Tier(구독자 100만+ 등)와 이름이 같아 구독자 763명 채널에 'Tier 1'이 붙는 등 혼란을
 * 줬다. 벤치마킹하는 사람에게 필요한 건 '나와 비슷한 체급'이라 구독자 구간으로 바꾼다.
 * 구간은 실제 분포에 맞췄다 (10-14 기준 성장 중 6,872개: 1천 미만 30%, 1천~1만 58%,
 * 1만~10만 11%, 10만 이상 14개).
 */
const SIZE_BANDS = [
    { key: "lt1k", label: "1천 미만", min: 0, max: 1_000 },
    { key: "1k", label: "1천~1만", min: 1_000, max: 10_000 },
    { key: "10k", label: "1만~10만", min: 10_000, max: 100_000 },
    { key: "100k", label: "10만 이상", min: 100_000, max: Infinity },
] as const;
type SizeKey = (typeof SIZE_BANDS)[number]["key"];

/**
 * 채널 나이 필터. [2026-10-14] 신규 채널 = 개설 90일 이내 (NEW_CHANNEL_DAYS).
 * 10-13 기준 국내 4,000개 중 90일 이내 1,028개(성장 중 892개), 1년 이내 2,268개.
 */
const AGE_BANDS = [
    { key: "90d", label: `✨ 3개월 이내 (신규)`, maxDays: NEW_CHANNEL_DAYS },
    { key: "1y", label: "1년 이내", maxDays: 365 },
] as const;
type AgeKey = (typeof AGE_BANDS)[number]["key"];

/** 처음에 그리는 카드 수, '더 보기' 한 번에 늘리는 수 */
const PAGE_SIZE = 60;

// ─── Pill Button ──────────────────────────────────────────────────────────────

function Pill({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                fontFamily: "var(--font-pretendard), 'Pretendard', sans-serif",
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

// ─── Benchmarking Info Panel ────────────────────────────────────────────

function BenchmarkingInfoPanel() {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[12px] font-medium text-violet-600 shadow-sm transition-all hover:bg-violet-100 hover:shadow"
            >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <circle cx="6.5" cy="6.5" r="6" stroke="currentColor" strokeWidth="1.2" />
                    <text x="6.5" y="10" textAnchor="middle" fontSize="8" fill="currentColor" fontWeight="700">?</text>
                </svg>
                채널 발굴 방식
                <svg
                    width="10" height="10" viewBox="0 0 10 10" fill="none"
                    className={cn("transition-transform duration-200", open ? "rotate-180" : "")}
                >
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
            </button>

            {open && (
                <div className="absolute left-0 top-full z-50 mt-2 w-[min(520px,92vw)] rounded-2xl border border-neutral-100 bg-white p-6 shadow-xl">

                    {/* 제목 */}
                    <h3 className="mb-3 text-[15px] font-black tracking-tight text-neutral-900">
                        📈 벤치마킹 채널은 어떻게 발굴되나요?
                    </h3>

                    {/* 인트로 */}
                    <p className="mb-4 text-[13px] leading-relaxed text-neutral-600">
                        우연히 영상 하나가 터진 &lsquo;원히트원더&rsquo;를 걸러내고, 기획력이 튼튼해서 꾸준히 우상향하는
                        <strong className="text-neutral-800"> 꿀통 채널만</strong> 찾아냅니다.
                        최근 7일간 업로드된 신규 영상들의 성과를 바탕으로
                        자체적인 <strong className="text-violet-600">&lsquo;바이럴 점수(Viral Score)&rsquo;</strong>를
                        계산하여 순위를 매깁니다.
                    </p>

                    {/* 소제목 1 */}
                    <div className="mb-4 rounded-xl bg-neutral-50 p-4">
                        <h4 className="mb-2 text-[13px] font-bold text-neutral-800">
                            진짜 실력을 가려내는 &lsquo;거품 제거&rsquo; 시스템
                        </h4>
                        <p className="mb-3 text-[12px] leading-relaxed text-neutral-500">
                            구독자 1명인 채널이 우연히 1만 뷰를 찍었다고 1위가 될 수는 없습니다. Viral Hunter는 아래와 같은 까다로운 기준으로 조회수 거품을 걸어냅니다.
                        </p>
                        <ul className="space-y-2 text-[12px] leading-relaxed text-neutral-600">
                            <li className="flex gap-2">
                                <span className="shrink-0">📱</span>
                                <span><strong>숏츠(Shorts) 빡센 검증:</strong> 숏츠는 알고리즘을 타면 조회수가 쉽게 뻥튀기됩니다. 이를 막기 위해 가상의 기본 구독자 3,000명이 있다고 가정(페널티 부여)하여, 뽀록이 아닌 진짜 떡상 숏츠 채널만 찾아냅니다.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="shrink-0">🖥️</span>
                                <span><strong>롱폼(Long-form) 실력 검증:</strong> 롱폼은 가상의 기본 구독자 1,000명을 기준으로 점수를 억눌러, 썸네일과 내용 기획력이 압도적인 알짜배기 하꼬 채널을 발굴합니다.</span>
                            </li>
                        </ul>
                    </div>

                    {/* 소제목 2
                        [2026-10-30] 채널 등급 추적(1~375위 1시간·376~1,000위 6시간·그 아래 하루)을 끄고,
                        최근 7일 안에 수집된 채널의 숫자를 매일 오후 5시 수집 뒤 한 번 받는 방식으로 바꿨다. */}
                    <div className="rounded-xl bg-violet-50 p-4">
                        <h4 className="mb-2 text-[13px] font-bold text-violet-800">
                            🔍 채널 숫자는 하루 한 번 새로 받아요
                        </h4>
                        <p className="mb-3 text-[12px] leading-relaxed text-violet-700">
                            국내 숏츠·국내 롱폼·해외 숏츠·해외 롱폼 네 리그에서 각각 상위 2,000개(총 8,000개)를 고릅니다.
                            순위와 상관없이, 최근 7일 안에 수집에 걸린 채널은 모두 매일 오후 5시 수집 뒤 구독자·조회수를 한 번 새로 받습니다.
                        </p>
                        <ul className="space-y-2 text-[12px] text-violet-700">
                            <li className="flex items-center gap-2">
                                <span className="shrink-0 rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-800">8,000개 전부</span>
                                <span>하루 1번 갱신 (오후 5시 수집 뒤)</span>
                            </li>
                        </ul>
                    </div>

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


// ─── Channel Card Skeleton ──────────────────────────────────────────

function ChannelCardSkeleton() {
    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm">
            <div className="relative aspect-video w-full animate-pulse bg-neutral-200" />
            <div className="flex flex-col p-4 gap-3">
                <div className="h-4 w-3/5 animate-pulse rounded-lg bg-neutral-200" />
                <div className="h-3 w-2/5 animate-pulse rounded-lg bg-neutral-100" />
                <div className="flex flex-col gap-2 mt-1">
                    <div className="h-9 w-full animate-pulse rounded-xl bg-orange-50" />
                    <div className="h-9 w-full animate-pulse rounded-xl bg-emerald-50" />
                    <div className="h-9 w-full animate-pulse rounded-xl bg-violet-50" />
                </div>
                <div className="flex gap-1.5 mt-1">
                    <div className="h-5 w-16 animate-pulse rounded-full bg-neutral-100" />
                    <div className="h-5 w-12 animate-pulse rounded-full bg-neutral-100" />
                </div>
            </div>
        </div>
    );
}

// ─── Share Button ────────────────────────────────────────────────────────────

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
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[12px] font-medium text-violet-600 shadow-sm transition-all hover:bg-violet-100 hover:shadow"
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

// ─── Main Client Component ────────────────────────────────────────────

export function BenchmarkingDashboardClient({
    initialChannels,
    categories: initialCategories,
    originTypes: initialOriginTypes,
    targetDate,
}: {
    initialChannels: TierChannel[];
    categories: string[];
    originTypes: string[];
    targetDate: string | null;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // ── URL 파라미터에서 필터 초기값 읽기 ─────────────────────────────────
    function initSortBy(): SortKey {
        const v = searchParams.get("sort");
        if (v === "avg_daily_view_increase" || v === "avg_daily_sub_increase" || v === "damped_score") return v;
        return "damped_score";
    }
    function initSize(): SizeKey | null {
        const v = searchParams.get("size");
        return SIZE_BANDS.some((b) => b.key === v) ? (v as SizeKey) : null;
    }
    // [2026-10-14] 기본값을 국내로. '전체'로 두면 첫 화면 60개가 전부 해외 소형 채널
    // (57개가 구독자 1만 미만)이었다. 랭킹 페이지와 같은 규칙이다 — 전체는 region=ALL.
    function initOrigin(): OriginState {
        const v = searchParams.get("region");
        if (v === "ALL") return null;
        if (v === "IMPORTED") return "IMPORTED";
        return "DOMESTIC";
    }

    const [sortBy, setSortByState] = useState<SortKey>(initSortBy);
    const [league, setLeagueState] = useState<LeagueState>(searchParams.get("league") ?? null);
    const [origin, setOriginState] = useState<OriginState>(initOrigin);
    const [category, setCategoryState] = useState<string | null>(searchParams.get("category"));
    const [size, setSizeState] = useState<SizeKey | null>(initSize);
    const [age, setAgeState] = useState<AgeKey | null>(() => {
        const v = searchParams.get("age");
        return AGE_BANDS.some((b) => b.key === v) ? (v as AgeKey) : null;
    });
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    // ── URL 동기화 헬퍼 ─────────────────────────────────────────────────────
    const syncUrl = useCallback((updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([k, v]) => {
            if (v === null) params.delete(k); else params.set(k, v);
        });
        const qs = params.toString();
        router.push(qs ? `?${qs}` : "?", { scroll: false });
        // 필터·정렬을 바꾸면 다시 처음 60개부터 보여준다 (랭킹 페이지와 같은 동작).
        setVisibleCount(PAGE_SIZE);
        // 필터 버튼은 모두 이 함수를 거친다. null 은 기본값으로 돌아간 것.
        const [name, value] = Object.entries(updates)[0] ?? [];
        if (name) track("filter_change", { board: "benchmarking", filter_name: name, filter_value: value ?? "default" });
    }, [router, searchParams]);

    function setSortBy(v: SortKey) { setSortByState(v); syncUrl({ sort: v === "damped_score" ? null : v }); }
    function setLeague(v: LeagueState) { setLeagueState(v); syncUrl({ league: v }); }
    // 기본값(국내)일 때 파라미터를 지워 URL 을 깨끗하게 유지한다.
    function setOrigin(v: OriginState) { setOriginState(v); syncUrl({ region: v === "DOMESTIC" ? null : v ?? "ALL" }); }
    function setCategory(v: string | null) { setCategoryState(v); syncUrl({ category: v }); }
    function setSize(v: SizeKey | null) { setSizeState(v); syncUrl({ size: v }); }
    function setAge(v: AgeKey | null) { setAgeState(v); syncUrl({ age: v }); }

    // ── CDN에서 전체 JSON 최초 1회 로드 ────────────────────────────────────────
    const [allChannels, setAllChannels] = useState<TierChannel[]>(initialChannels);
    const [categories, setCategories] = useState<string[]>(initialCategories);
    const [originTypes, setOriginTypes] = useState<string[]>(initialOriginTypes);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(() => {
        setLoading(true);
        setError(null);
        // 출처 스위치. Supabase 경로는 sparkline_data 를 뺀 같은 형태의 배열을
        // 돌려주므로 아래 처리는 양쪽 모두 그대로 동작한다. (이 화면은 그 필드를
        // 쓰지 않는데 GitHub 파일에서는 그게 용량의 대부분이었다)
        fetch(isSupabase ? "/api/channels" : CHANNELS_URL)
            .then(async (r) => {
                if (!r.ok) throw new Error(`CDN ${r.status}`);
                // Content-Type이 gzip/octet-stream이면 수동 dicompression
                const ct = r.headers.get("content-type") ?? "";
                if (ct.includes("gzip") || ct.includes("octet-stream")) {
                    const ds = new DecompressionStream("gzip");
                    const decompressed = r.body!.pipeThrough(ds);
                    const text = await new Response(decompressed).text();
                    return JSON.parse(text);
                }
                return r.json();
            })
            .then((raw) => {
                const rawArr: TierChannel[] = Array.isArray(raw) ? raw : [];

                const dates = rawArr.map((c) => c.target_date).filter(Boolean).sort();
                const latest = dates[dates.length - 1] ?? null;
                const latestAll = latest ? rawArr.filter((c) => c.target_date === latest) : rawArr;

                // 성장이 멈췄거나 역성장한 채널 제외 — 서버(page.tsx)와 동일한 기준이어야
                // 마운트 후 재요청 시 걸러졌던 채널이 되살아나지 않는다.
                const latestData = latestAll.filter((c) => (c.avg_daily_view_increase ?? 0) > 0);
                setAllChannels(latestData);

                const catSet = new Set<string>();
                const originSet = new Set<string>();
                for (const ch of latestData) {
                    if (ch.main_category && ch.main_category !== "overall") catSet.add(ch.main_category);
                    if (ch.origin_type) originSet.add(ch.origin_type);
                }
                setCategories(Array.from(catSet).sort());
                setOriginTypes(Array.from(originSet).sort());
            })
            .catch((e) => { setError(e.message); })
            .finally(() => { setLoading(false); });
    }, []);

    useEffect(() => { refetch(); }, [refetch]);


    // ── 클라이언트 사이드 필터 + 정렬 (재쿼리 없음) ────────────────────────────
    // [2026-10-14] '신규 진입 채널만 보기'를 뺐다. 신규 채널은 측정이 한 번뿐이라 일평균이
    // 0 인데, 위에서 일평균 0 이하를 걸러내므로 켜면 항상 0개였다.
    const matched = useMemo(() => {
        let filtered = allChannels;
        if (league !== null) filtered = filtered.filter((c) => c.league_group === league);
        if (origin !== null) filtered = filtered.filter((c) => c.origin_type === origin);
        if (category !== null) filtered = filtered.filter((c) => c.main_category === category);
        if (size !== null) {
            const band = SIZE_BANDS.find((b) => b.key === size)!;
            filtered = filtered.filter((c) => (c.subscriber_count ?? 0) >= band.min && (c.subscriber_count ?? 0) < band.max);
        }
        if (age !== null) {
            const maxDays = AGE_BANDS.find((b) => b.key === age)!.maxDays;
            filtered = filtered.filter((c) => {
                const d = channelAgeDays(c);
                return d !== null && d <= maxDays;
            });
        }
        return [...filtered].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));
    }, [allChannels, league, origin, category, size, age, sortBy]);

    const channels = useMemo(() => matched.slice(0, visibleCount), [matched, visibleCount]);

    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="inline-flex h-2 w-2 rounded-full bg-violet-500" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                            매일 오후 5시 수집분 기준 · {formatTargetDate(targetDate)} 집계
                        </span>
                    </div>
                    <h1 className="flex flex-col leading-none">
                        <span
                            className="text-[clamp(3.5rem,10vw,8rem)] leading-[0.9] tracking-tight"
                            style={{
                                fontFamily: "var(--font-bebas), sans-serif",
                                background: "linear-gradient(135deg, #7C3AED 0%, #3B82F6 45%, #1A1A1A 75%, #000000 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}
                        >
                            BENCHMARKING
                        </span>
                        <span
                            className="text-[clamp(1.2rem,4vw,2.8rem)] font-black tracking-tight leading-snug -mt-1"
                            style={{
                                fontFamily: "var(--font-noto), 'Noto Sans KR', sans-serif",
                                background: "linear-gradient(135deg, #2A2A2A 0%, #555555 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}
                        >
                            유튜브 급성장 채널 순위
                        </span>
                        {/* [2026-10-16] 화면에 안 보이는 키워드 묶음(sr-only)을 h1 에서 뺐다.
                            검색엔진이 '숨긴 텍스트'로 볼 수 있어 득보다 위험이 크다.
                            검색어는 보이는 제목·설명문에 담는다. */}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <p className="text-base text-[#555555]">구독자 대비 조회수가 잘 나오는 유튜브 채널을 찾아 바이럴 화력과 일평균 성과를 비교합니다</p>
                        <BenchmarkingInfoPanel />
                        <ShareButton />
                    </div>
                    {/* YouTube API 정책 III.E.4.h: 자체 계산 지표 고지 */}
                    <MetricsDisclosure className="mt-2" />

                    {/* [2026-10-14] 이 목록이 '무엇의 순위인지'를 펼치지 않아도 보이게 한다.
                        방문이 많은 페이지인데 기준이 팝오버 안에만 있어 오해가 생겼다. */}
                    <ol className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {[
                            {
                                step: "1",
                                title: "매일 오후 5시에 수집",
                                body: "최근 2일 안에 올라온 영상 중 조회수가 높은 영상을 모으고, 그 영상을 올린 채널을 후보로 삼습니다.",
                            },
                            {
                                step: "2",
                                title: "바이럴 화력으로 줄 세우기",
                                body: "최근 7일 영상의 평균 조회수를 구독자 수로 나눈 값입니다. 구독자가 적은데 조회수가 잘 나올수록 높습니다.",
                            },
                            {
                                step: "3",
                                title: "성장 중인 채널만 표시",
                                body: "조회수가 늘지 않는 채널은 뺍니다. 형식·지역·카테고리·구독자 규모·채널 나이로 나와 비슷한 채널을 골라 보세요.",
                            },
                        ].map((s) => (
                            <li key={s.step} className="flex gap-3 rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[12px] font-bold text-white">
                                    {s.step}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-bold text-neutral-800">{s.title}</p>
                                    <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-500">{s.body}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* ── Filter Bar ──────────────────────────────────────────── */}
                <div className="mb-8 space-y-3.5 rounded-2xl border border-neutral-100 bg-white px-5 py-4 shadow-sm">

                    {/* Row 1: Sort */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                            정렬 기준 ▸
                        </span>
                        {([
                            { key: "damped_score", label: "🔥 바이럴 파워순" },
                            { key: "avg_daily_view_increase", label: "📈 일평균 조회수 급상승순" },
                            { key: "avg_daily_sub_increase", label: "👥 구독자 급상승순" },
                        ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                            <Pill key={key} active={sortBy === key} onClick={() => setSortBy(key)}>
                                {label}
                            </Pill>
                        ))}
                    </div>

                    <div className="h-px bg-neutral-100" />

                    {/* Row 2: Filters Group */}
                    <div className="flex flex-col gap-3">

                        {/* Format (league_group) */}
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:w-16 sm:mt-2">형식</span>
                            <div className="flex flex-wrap gap-[6px]">
                                <Pill active={league === null} onClick={() => setLeague(null)}>전체</Pill>
                                <Pill active={league === "SHORTS"} onClick={() => setLeague("SHORTS")}>📱 Shorts</Pill>
                                <Pill active={league === "LONG"} onClick={() => setLeague("LONG")}>📺 Long-form</Pill>
                                <Pill active={league === "HYBRID"} onClick={() => setLeague("HYBRID")}>🎬 Hybrid</Pill>
                            </div>
                        </div>

                        {/* Origin */}
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:w-16 sm:mt-2">지역</span>
                            <div className="flex flex-wrap gap-[6px]">
                                {originTypes.map((o) => (
                                    <Pill key={o} active={origin === o} onClick={() => setOrigin(o)}>
                                        {o === "DOMESTIC" ? "🇰🇷 국내" : o === "IMPORTED" ? "🌐 해외" : `🌍 ${o}`}
                                    </Pill>
                                ))}
                                <Pill active={origin === null} onClick={() => setOrigin(null)}>국내+해외</Pill>
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

                        {/* Subscriber size */}
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:w-16 sm:mt-2">구독자</span>
                            <div className="flex flex-wrap gap-[6px]">
                                <Pill active={size === null} onClick={() => setSize(null)}>전체</Pill>
                                {SIZE_BANDS.map((b) => (
                                    <Pill key={b.key} active={size === b.key} onClick={() => setSize(b.key)}>{b.label}</Pill>
                                ))}
                            </div>
                        </div>

                        {/* Channel age */}
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:w-16 sm:mt-2">채널 나이</span>
                            <div className="flex flex-wrap items-center gap-[6px]">
                                <Pill active={age === null} onClick={() => setAge(null)}>전체</Pill>
                                {AGE_BANDS.map((b) => (
                                    <Pill key={b.key} active={age === b.key} onClick={() => setAge(b.key)}>{b.label}</Pill>
                                ))}
                                <span className="ml-1 text-[11px] text-neutral-400">유튜브에 표시된 채널 개설일 기준</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Error UI ──────────────────────────────────────────────── */}
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

                {/* ── Status ──────────────────────────────────────────────── */}
                {!error && !loading && (
                    <div className="mb-5">
                        <p className="text-xs font-medium text-neutral-400">
                            조건에 맞는 채널 {matched.length.toLocaleString()}개 중 {channels.length.toLocaleString()}개 표시 중
                        </p>
                    </div>
                )}

                {/* ── Grid ────────────────────────────────────────────────── */}
                {loading ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <ChannelCardSkeleton key={i} />
                        ))}
                    </div>
                ) : !error && channels.length === 0 ? (
                    <div className="flex h-64 items-center justify-center rounded-2xl border border-neutral-100 bg-neutral-50/50 text-sm text-neutral-400">
                        선택한 필터에 해당하는 채널이 없습니다.
                    </div>
                ) : !error ? (
                    <>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {channels.map((ch, i) => (
                                <ChannelBentoCard
                                    key={ch.channel_id}
                                    channel={ch}
                                    rank={i + 1}
                                    sortBy={sortBy}
                                />
                            ))}
                        </div>

                        {/* 더 보기 — 데이터는 이미 받아둔 상태라 클릭 즉시 펼쳐진다(추가 요청 없음). */}
                        {matched.length > channels.length && (
                            <div className="mt-10 flex flex-col items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                                    className="rounded-full border border-neutral-200 bg-white px-6 py-2.5 text-[13px] font-medium text-neutral-700 transition-all hover:border-neutral-300 hover:bg-neutral-50"
                                >
                                    더 보기 (+{Math.min(PAGE_SIZE, matched.length - channels.length)})
                                </button>
                                <p className="text-[11px] text-neutral-400">
                                    {(matched.length - channels.length).toLocaleString()}개 더 있습니다
                                </p>
                            </div>
                        )}
                    </>
                ) : null}


            </main>
        </div>
    );
}
