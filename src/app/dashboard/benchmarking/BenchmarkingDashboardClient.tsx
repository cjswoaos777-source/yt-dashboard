"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { TierChannel } from "@/lib/tier-channel-types";
import { ChannelBentoCard } from "@/components/dashboard/ChannelBentoCard";
import { CHANNELS_URL } from "@/lib/cdn";

// ─── targetDate 포맷터: '2026-03-31' → '2026.03.31'
function formatTargetDate(d: string | null): string {
    if (!d) return "업데이트 중";
    return d.replace(/-/g, ".");
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "avg_daily_view_increase" | "avg_daily_sub_increase" | "damped_score";
type LeagueState = null | string;
type OriginState = null | string;
type TierState = null | number;

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

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
}) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="inline-flex items-center gap-2.5 select-none group"
        >
            <span
                className={cn(
                    "relative inline-flex h-[22px] w-[40px] shrink-0 rounded-full border-2 transition-colors duration-200",
                    checked ? "bg-violet-600 border-violet-600" : "bg-neutral-200 border-neutral-200"
                )}
            >
                <span
                    className={cn(
                        "pointer-events-none inline-block h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 mt-[2px]",
                        checked ? "translate-x-[20px]" : "translate-x-[2px]"
                    )}
                />
            </span>
            <span
                className={cn(
                    "text-[13px] font-medium transition-colors",
                    checked ? "text-violet-700" : "text-neutral-500 group-hover:text-neutral-800"
                )}
            >
                {label}
            </span>
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

                    {/* 소제목 2 */}
                    <div className="rounded-xl bg-violet-50 p-4">
                        <h4 className="mb-2 text-[13px] font-bold text-violet-800">
                            🔍 순위에 따른 밀착 감시 주기
                        </h4>
                        <p className="mb-3 text-[12px] leading-relaxed text-violet-700">
                            매일 새벽 1시, 계산된 바이럴 점수에 따라 채널 그룹이 나뉘며 상위 그룹일수록 데이터를 더 자주 수집합니다.
                        </p>
                        <ul className="space-y-2 text-[12px] text-violet-700">
                            <li className="flex items-center gap-2">
                                <span className="shrink-0 rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-800">1티어</span>
                                <span><strong>상위 1,500개</strong> — 매 1시간마다 데이터 갱신</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="shrink-0 rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-800">2티어</span>
                                <span><strong>상위 2,500개</strong> — 매 6시간마다 데이터 갱신</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="shrink-0 rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-800">3티어</span>
                                <span><strong>상위 4,000개</strong> — 하루 1번(24시간) 갱신</span>
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
    function initTier(): TierState {
        const v = searchParams.get("tier");
        const n = Number(v);
        if (n === 1 || n === 2 || n === 3) return n;
        return null;
    }

    const [sortBy, setSortByState] = useState<SortKey>(initSortBy);
    const [league, setLeagueState] = useState<LeagueState>(searchParams.get("league") ?? null);
    const [origin, setOriginState] = useState<OriginState>(searchParams.get("region") ?? null);
    const [category, setCategoryState] = useState<string | null>(searchParams.get("category"));
    const [tier, setTierState] = useState<TierState>(initTier);
    const [isNewOnly, setIsNewOnlyState] = useState(searchParams.get("new") === "1");

    // ── URL 동기화 헬퍼 ─────────────────────────────────────────────────────
    const syncUrl = useCallback((updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([k, v]) => {
            if (v === null) params.delete(k); else params.set(k, v);
        });
        const qs = params.toString();
        router.push(qs ? `?${qs}` : "?", { scroll: false });
    }, [router, searchParams]);

    function setSortBy(v: SortKey) { setSortByState(v); syncUrl({ sort: v === "damped_score" ? null : v }); }
    function setLeague(v: LeagueState) { setLeagueState(v); syncUrl({ league: v }); }
    function setOrigin(v: OriginState) { setOriginState(v); syncUrl({ region: v }); }
    function setCategory(v: string | null) { setCategoryState(v); syncUrl({ category: v }); }
    function setTier(v: TierState) { setTierState(v); syncUrl({ tier: v !== null ? String(v) : null }); }
    function setIsNewOnly(v: boolean) { setIsNewOnlyState(v); syncUrl({ new: v ? "1" : null }); }

    // ── CDN에서 전체 JSON 최초 1회 로드 ────────────────────────────────────────
    const [allChannels, setAllChannels] = useState<TierChannel[]>(initialChannels);
    const [categories, setCategories] = useState<string[]>(initialCategories);
    const [originTypes, setOriginTypes] = useState<string[]>(initialOriginTypes);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(() => {
        setLoading(true);
        setError(null);
        fetch(CHANNELS_URL)
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
                const latestData = latest ? rawArr.filter((c) => c.target_date === latest) : rawArr;
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
    const channels = useMemo(() => {
        let filtered = allChannels;
        if (league !== null) filtered = filtered.filter((c) => c.league_group === league);
        if (origin !== null) filtered = filtered.filter((c) => c.origin_type === origin);
        if (category !== null) filtered = filtered.filter((c) => c.main_category === category);
        if (tier !== null) filtered = filtered.filter((c) => c.tier === tier);
        if (isNewOnly) filtered = filtered.filter((c) => c.is_new_channel);
        return [...filtered]
            .sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0))
            .slice(0, 60);
    }, [allChannels, league, origin, category, tier, isNewOnly, sortBy]);

    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="inline-flex h-2 w-2 rounded-full bg-violet-500" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                            매일 새벽 1시 갱신 · {formatTargetDate(targetDate)} 기준
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
                            유튜브 랭킹 및 채널 분석 리포트
                        </span>
                        {/* 검색 엔진을 위한 보이지 않는 핵심 키워드 덩어리 */}
                        <span className="sr-only">유튜브 순위, 실시간 유튜브 떡상 알고리즘 분석, 급상승 채널 조회수 수익 벤치마킹 대시보드</span>
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <p className="text-base text-[#555555]">성장 가능성이 높은 꿀통 채널들의 바이럴 파워와 일평균 성과를 분석합니다</p>
                        <BenchmarkingInfoPanel />
                        <ShareButton />
                    </div>
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
                                <Pill active={origin === null} onClick={() => setOrigin(null)}>전체</Pill>
                                {originTypes.map((o) => (
                                    <Pill key={o} active={origin === o} onClick={() => setOrigin(o)}>
                                        {o === "DOMESTIC" ? "🇰🇷 국내" : o === "IMPORTED" ? "🌐 해외" : `🌍 ${o}`}
                                    </Pill>
                                ))}
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

                        {/* Tier */}
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:w-16 sm:mt-2">티어</span>
                            <div className="flex flex-wrap gap-[6px]">
                                <Pill active={tier === null} onClick={() => setTier(null)}>전체</Pill>
                                <Pill active={tier === 1} onClick={() => setTier(1)}>🥇 Tier 1</Pill>
                                <Pill active={tier === 2} onClick={() => setTier(2)}>🥈 Tier 2</Pill>
                                <Pill active={tier === 3} onClick={() => setTier(3)}>🥉 Tier 3</Pill>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-neutral-100" />

                    {/* Quick filter: New only toggle */}
                    <div className="flex flex-wrap items-center gap-3">
                        <ToggleSwitch
                            checked={isNewOnly}
                            onChange={setIsNewOnly}
                            label="✨ 신규 진입 채널만 보기"
                        />
                        <span className="text-[11px] text-neutral-400">
                            티어에 새롭게 진입한 채널만 표시합니다
                        </span>
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
                        <p className="text-xs font-medium text-neutral-400">{channels.length}개 채널 표시 중</p>
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
                ) : null}


            </main>
        </div>
    );
}
