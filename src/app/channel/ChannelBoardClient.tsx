"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { MetricsDisclosure } from "@/components/legal";
import { track, currentPageType } from "@/lib/analytics";
import { categoryKo, fmtKr } from "@/components/site/rank";
import { NEW_CHANNEL_DAYS, channelAgeDays } from "@/lib/tier-channel-types";
import {
    AGE_BANDS, BOARD_CATEGORIES, BOARD_FORMATS, BOARD_LIMIT, BOARD_PRESETS, BOARD_SORTS,
    DEFAULT_BOARD_QUERY, SIZE_BANDS, boardMetric, boardQueryString, parseBoardQuery,
    type BoardChannel, type BoardQuery, type BoardSort,
} from "@/lib/channel-board";

/*
 * 지금 뜨는 채널 (2026-10-31, 사용자 결정).
 *
 * 영상 순위(/dashboard 의 DashboardClient)와 같은 모양·같은 동작이다. 필터를 바꾸면 주소가 바뀌고,
 * 조합마다 서버에서 상위 1,000곳을 받는다(/api/channel-board). 예전 벤치마킹(필터)과
 * 떠오르는 채널(필터 없는 표)을 이 화면 하나로 합쳤다.
 */

/** 처음에 그리는 줄 수, '더 보기' 한 번에 늘리는 수 */
const DISPLAY_LIMIT = 50;
const PAGE_STEP = 50;

const FORMAT_SHORT: Record<string, string> = { SHORTS: "쇼츠", LONG: "롱폼", HYBRID: "쇼츠+롱폼" };

function formatDate(d: string | null): string {
    return d ? d.replace(/-/g, ".") : "업데이트 중";
}

/** 1만 미만 소수(바이럴 점수)는 한 자리까지 */
function fmtValue(v: number, sort: BoardSort): string {
    if (sort === "viral") return v >= 1_000 ? fmtKr(Math.round(v)) : v.toFixed(1);
    return fmtKr(Math.abs(Math.round(v)));
}

function signOf(v: number, sort: BoardSort): string {
    if (sort === "viral") return "";
    return v < 0 ? "-" : "+";
}

// ─── Pill (영상 순위와 같은 칩) ──────────────────────────────────────────────

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

// ─── 산정 방식 안내 ─────────────────────────────────────────────────────────

function InfoPanel() {
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
                순위 산정 방식
                <svg
                    width="10" height="10" viewBox="0 0 10 10" fill="none"
                    className={cn("transition-transform duration-200", open ? "rotate-180" : "")}
                >
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
            </button>

            {open && (
                <div className="vh-pop vh-pop-wide">
                    <h3>🚀 지금 뜨는 채널은 이렇게 줄 세웁니다</h3>
                    <p>
                        최근 7일 안에 수집된 <strong>국내 채널 전부</strong>의 구독자·조회수를 매일 저녁 새로 받아,
                        하루 평균 얼마나 늘었는지로 줄을 세웁니다. 미리 몇 곳을 골라 두지 않습니다.
                    </p>
                    <ul className="vh-pop-list">
                        <li>
                            <strong>떠오르는 순</strong> 하루 조회수 증가를 구독자 수로 나눈 값입니다. 구독자에 비해
                            조회수가 빠르게 느는 채널이 위에 옵니다. 구독자 수백 명 채널이 영상 하나로 1위가 되지 않게
                            가상의 구독자 1만 명을 더해 계산합니다.
                        </li>
                        <li><strong>조회수 증가순</strong> 채널 전체 조회수가 하루 평균 얼마나 늘었는지입니다.</li>
                        <li>
                            <strong>구독자 증가순</strong> 구독자가 하루 평균 얼마나 늘었는지입니다. 유튜브가 구독자 수를
                            앞 세 자리로만 알려 줘서 큰 채널은 계단식으로 늡니다.
                        </li>
                        <li>
                            <strong>바이럴 점수순</strong> 최근 7일 영상의 평균 조회수를 구독자 수로 나눈 값입니다
                            (쇼츠 채널은 구독자 3,000명, 그 밖은 1,000명을 더해 계산).
                        </li>
                    </ul>
                    <p>국내 채널은 최근 30일 동안 수집된 영상의 절반 이상이 한국어인 채널입니다.</p>
                    <button type="button" onClick={() => setOpen(false)} className="vh-pop-close">
                        닫기 ✕
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── 공유 ─────────────────────────────────────────────────────────────────

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
        <button onClick={handleCopy} title="현재 필터 URL 복사" className="vh-btn-ghost">
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

// ─── 한 줄 ─────────────────────────────────────────────────────────────────

function RowSkeleton() {
    return (
        <div className="vh-rrow" aria-hidden="true">
            <span className="vh-th vh-skel" />
            <span className="vh-rk"><span className="vh-skel" style={{ display: "inline-block", width: 22, height: 26 }} /></span>
            <span className="vh-tt">
                <span className="vh-skel" style={{ display: "block", height: 12, width: "30%" }} />
                <span className="vh-skel" style={{ display: "block", height: 16, width: "60%" }} />
            </span>
            <span className="vh-mv"><span className="vh-skel" style={{ display: "block", height: 18, width: 72 }} /></span>
        </div>
    );
}

function ChannelRow({ c, rank, sort }: { c: BoardChannel; rank: number; sort: BoardSort }) {
    const [imgError, setImgError] = useState(false);
    const metric = boardMetric(c, sort);
    const ageDays = channelAgeDays(c);
    const isNew = ageDays !== null && ageDays <= NEW_CHANNEL_DAYS;

    const body = (
        <>
            <span className="vh-th">
                {c.video_thumbnail && !imgError ? (
                    <Image
                        src={c.video_thumbnail}
                        alt={`${c.channel_title} 최근 인기 영상`}
                        fill
                        sizes="(max-width: 640px) 96px, 128px"
                        onError={() => setImgError(true)}
                        unoptimized
                    />
                ) : (
                    <span className="vh-th-fallback">📺</span>
                )}
            </span>
            <span className="vh-rk">{rank}</span>
            {c.league_group && <span className="vh-rtype">{FORMAT_SHORT[c.league_group]}</span>}

            <span className="vh-tt">
                <span className="vh-rch">
                    {c.main_category ? categoryKo(c.main_category) : "분류 없음"}
                    {isNew && ` · 개설 ${ageDays}일`}
                </span>
                <h3 className="vh-title">{c.channel_title}</h3>
            </span>
            <span className="vh-mv">
                <small>{metric.label}</small>
                <strong>
                    {signOf(metric.value, sort)}
                    {fmtValue(metric.value, sort)}
                    {metric.unit}
                </strong>
            </span>
            <span className="vh-rmeta">
                {/* 한 덩어리로 둔다. 따로 두면 휴대폰에서 줄 앞에 '·' 가 걸린다. */}
                <span>
                    구독자 {fmtKr(c.subscriber_count)}명 &middot;{" "}
                    {sort === "subs" || sort === "viral"
                        ? `하루 조회수 +${fmtKr(Math.max(0, c.avg_daily_view_increase))}회`
                        : `하루 구독자 ${c.avg_daily_sub_increase < 0 ? "-" : "+"}${fmtKr(Math.abs(c.avg_daily_sub_increase))}명`}
                    {" "}&middot; 최근 7일 영상 {c.videos_7d.toLocaleString()}개
                </span>
                {isNew && <span className="vh-rtag">✨ 신규</span>}
            </span>
        </>
    );

    const common = {
        className: "vh-rrow",
        "data-top": rank <= 3 ? "" : undefined,
        "data-wide": rank >= 100 ? "" : undefined,
    };
    // 우리 채널 페이지가 있으면 그리로, 없으면(구독 1만 미만 등) 유튜브 채널로 보낸다.
    return c.has_page ? (
        <Link href={`/channel/${c.channel_id}`} {...common}>{body}</Link>
    ) : (
        <a
            href={`https://www.youtube.com/channel/${c.channel_id}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            {...common}
        >
            {body}
        </a>
    );
}

// ─── 화면 ─────────────────────────────────────────────────────────────────

export function ChannelBoardClient({
    initialRows,
    initialTotal,
    initialQuery,
    updatedDate,
}: {
    initialRows: BoardChannel[];
    initialTotal: number;
    initialQuery: BoardQuery;
    updatedDate: string | null;
}) {
    // 주소가 기준이다. 필터를 누르면 주소만 바꾸고(history.pushState) 화면은 주소에서 읽는다.
    // router.push 는 같은 페이지라도 서버 컴포넌트를 다시 그려, 필터를 누를 때마다 서버를 한 번 더 거친다.
    // 뒤로 가기도 주소를 따라 그대로 동작한다.
    const searchParams = useSearchParams();
    const q = useMemo(() => parseBoardQuery(searchParams), [searchParams]);
    const key = boardQueryString(q);

    // 서버가 그려 준 첫 목록은 앞 100곳뿐이라(full=false) 화면이 뜨면 1,000곳을 다시 받는다.
    const [data, setData] = useState({
        key: boardQueryString(initialQuery), rows: initialRows, total: initialTotal, full: false,
    });
    const [failedKey, setFailedKey] = useState<string | null>(null);
    const [retry, setRetry] = useState(0);
    // 몇 줄까지 펼쳤는지. 조합이 바뀌면 다시 처음 50곳부터 보여준다.
    const [shown, setShown] = useState({ key, n: DISPLAY_LIMIT });

    useEffect(() => {
        if (data.key === key && data.full) return;
        // 필터를 빠르게 연달아 누르면 앞 응답이 늦게 와 최신 결과를 덮을 수 있다. 지난 요청은 버린다.
        let stale = false;
        fetch(`/api/channel-board${key ? `?${key}` : ""}`)
            .then((r) => {
                if (!r.ok) throw new Error(`API ${r.status}`);
                return r.json() as Promise<{ rows: BoardChannel[]; total: number }>;
            })
            .then((d) => {
                if (stale) return;
                setData({ key, rows: d.rows, total: d.total, full: true });
                setFailedKey(null);
            })
            .catch(() => { if (!stale) setFailedKey(key); });
        return () => { stale = true; };
    }, [key, retry, data.key, data.full]);

    /** 필터를 바꾼다. name/value 는 GA 이벤트용 (누른 필터). */
    const apply = useCallback((next: BoardQuery, name: string, value: string | null) => {
        const qs = boardQueryString(next);
        window.history.pushState(null, "", qs ? `?${qs}` : window.location.pathname);
        track("filter_change", { board: "channels", filter_name: name, filter_value: value ?? "default" });
    }, []);

    const set = <K extends keyof BoardQuery>(k: K, v: BoardQuery[K]) => apply({ ...q, [k]: v }, k, v as string | null);

    const error = failedKey === key;
    const loading = data.key !== key && !error;
    const rows = data.rows;
    const total = data.total;
    const visibleCount = shown.key === key ? shown.n : DISPLAY_LIMIT;
    const visible = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);
    const liveDate = rows[0]?.target_date ?? updatedDate;
    const activePreset = BOARD_PRESETS.find(
        (p) => boardQueryString({ ...DEFAULT_BOARD_QUERY, ...p.query }) === boardQueryString(q),
    )?.key;

    return (
        <main className="vh-main">
            {/* ── 머리 ─────────────────────────────────────────── */}
            <div className="vh-rhead">
                <p className="vh-eyebrow">매일 저녁 갱신 · {formatDate(liveDate)} 집계</p>
                <h1>
                    <span className="vh-top1000">TOP 1000</span>
                    <span className="vh-h1-sub">지금 뜨는 유튜브 채널 순위</span>
                </h1>
                <div className="vh-tools">
                    <p className="vh-lead">
                        최근 7일 안에 영상이 뜬 국내 채널 전부를 매일 다시 재서, 구독자에 비해 조회수가 빠르게 느는
                        채널부터 보여 드립니다 · 쇼츠·롱폼, 구독자 규모, 카테고리, 채널 나이로 골라 보세요
                    </p>
                    <InfoPanel />
                    <ShareButton />
                </div>
                {/* YouTube API 정책 III.E.4.h: 자체 계산 지표 고지 */}
                <MetricsDisclosure />
            </div>

            {/* ── 필터 ─────────────────────────────────────────── */}
            <div className="vh-card vh-rfilters">
                <div className="vh-filter-row">
                    <span>바로 보기</span>
                    <div className="vh-chips">
                        <Pill active={boardQueryString(q) === ""} onClick={() => apply(DEFAULT_BOARD_QUERY, "preset", null)}>
                            전체 떠오르는 순
                        </Pill>
                        {BOARD_PRESETS.map((p) => (
                            <Pill
                                key={p.key}
                                active={activePreset === p.key}
                                onClick={() => apply({ ...DEFAULT_BOARD_QUERY, ...p.query }, "preset", p.key)}
                            >
                                {p.label}
                            </Pill>
                        ))}
                    </div>
                </div>

                <div className="vh-rfilters-line" />

                <div className="vh-filter-row">
                    <span>정렬 기준 ▸</span>
                    <div className="vh-chips">
                        {BOARD_SORTS.map(({ key, label }) => (
                            <Pill key={key} active={q.sort === key} onClick={() => set("sort", key)}>{label}</Pill>
                        ))}
                    </div>
                </div>

                <div className="vh-rfilters-line" />

                <div className="vh-filter-row">
                    <span>형식</span>
                    <div className="vh-chips">
                        <Pill active={q.format === null} onClick={() => set("format", null)}>전체</Pill>
                        {BOARD_FORMATS.map((f) => (
                            <Pill key={f.key} active={q.format === f.key} onClick={() => set("format", f.key)}>{f.label}</Pill>
                        ))}
                    </div>
                </div>

                <div className="vh-filter-row">
                    <span>구독자</span>
                    <div className="vh-chips">
                        <Pill active={q.size === null} onClick={() => set("size", null)}>전체</Pill>
                        {SIZE_BANDS.map((b) => (
                            <Pill key={b.key} active={q.size === b.key} onClick={() => set("size", b.key)}>{b.label}</Pill>
                        ))}
                    </div>
                </div>

                <div className="vh-filter-row">
                    <span>카테고리</span>
                    <div className="vh-chips">
                        <Pill active={q.category === null} onClick={() => set("category", null)}>전체</Pill>
                        {BOARD_CATEGORIES.map((c) => (
                            <Pill key={c} active={q.category === c} onClick={() => set("category", c)}>{categoryKo(c)}</Pill>
                        ))}
                    </div>
                    {/* 채널 카테고리는 수집한 영상에 붙은 유튜브 카테고리로 정한다(utube_rank collector·tracker).
                        영상 카테고리는 올린 사람이 고르는 값이라 내용과 다를 수 있다 (영상 순위의 안내와 같은 취지). */}
                    <p className="vh-filter-note">
                        카테고리는 채널 영상에 지정된 유튜브 카테고리를 바탕으로 정했습니다.
                        그래서 내용과 다른 카테고리에 들어간 채널이 있을 수 있어요.
                    </p>
                </div>

                <div className="vh-filter-row">
                    <span>채널 나이</span>
                    <div className="vh-chips">
                        <Pill active={q.age === null} onClick={() => set("age", null)}>전체</Pill>
                        {AGE_BANDS.map((b) => (
                            <Pill key={b.key} active={q.age === b.key} onClick={() => set("age", b.key)}>{b.label}</Pill>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── 오류 ─────────────────────────────────────────── */}
            {error && !loading && (
                <div className="vh-error">
                    <span className="vh-error-ic">🚨</span>
                    <div>
                        <b>데이터를 불러오지 못했습니다</b>
                        <p>잠시 후 다시 시도해주세요</p>
                    </div>
                    <button type="button" onClick={() => { setFailedKey(null); setRetry((n) => n + 1); }}>
                        다시 시도
                    </button>
                </div>
            )}

            {/* ── 개수 ─────────────────────────────────────────── */}
            {!error && !loading && (
                <p className="vh-count">
                    조건에 맞는 채널 {total.toLocaleString()}곳
                    {total > BOARD_LIMIT && ` · 상위 ${BOARD_LIMIT.toLocaleString()}곳까지`}
                    {" "}· {visible.length.toLocaleString()}곳 표시 중
                </p>
            )}

            {/* ── 목록 ─────────────────────────────────────────── */}
            {loading && rows.length === 0 ? (
                <div className="vh-list vh-rlist">
                    {Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)}
                </div>
            ) : !error && visible.length === 0 ? (
                <div className="vh-empty">선택한 필터에 해당하는 채널이 없습니다.</div>
            ) : !error ? (
                <>
                    <div className={cn("vh-list vh-rlist", loading && "vh-dim")}>
                        {visible.map((c, i) => (
                            <ChannelRow key={c.channel_id} c={c} rank={i + 1} sort={q.sort} />
                        ))}
                    </div>

                    {/* 더 보기 — 이미 받아 둔 1,000곳 안에서 펼친다(추가 요청 없음). */}
                    {rows.length > visible.length && (
                        <div className="vh-loadmore">
                            <button type="button" onClick={() => setShown({ key, n: visibleCount + PAGE_STEP })}>
                                더 보기 (+{Math.min(PAGE_STEP, rows.length - visible.length)})
                            </button>
                            <p>{(rows.length - visible.length).toLocaleString()}곳 더 있습니다</p>
                        </div>
                    )}
                </>
            ) : null}
        </main>
    );
}
