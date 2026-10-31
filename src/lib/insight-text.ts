/**
 * 인사이트 리포트의 요약·결론 문장.
 *
 * [2026-10-31] 처음에는 '시간대에 따라 1.4배', '숏츠 조회수 3.5배, 좋아요·댓글 비율은 롱폼이 훨씬 높다',
 * '1년 미만 채널이 가장 높다' 같은 결론을 글에 박아 두었다. 최근 30일 표본이 매일 바뀌면서 숫자와 반대가 됐다
 * (10-30 집계: 시간대 1.51배, 숏츠 2.2배인데 좋아요율은 숏츠가 더 높음, 1~3년 채널이 가장 높고 3개월 미만이 가장 낮음).
 * 그래서 결론 문장도 그날 숫자를 보고 고른다. 순수 함수만 둔다 (노드로 바로 시험할 수 있게).
 *
 * 문단 문자열의 **…** 는 굵게 보여 줄 부분이다. 페이지에서 <strong> 으로 바꾼다.
 */
import type { Insights, FormatRow, DurationRow, ChannelAgeRow } from "@/lib/insights";

export const DOW_LABEL = ["", "일", "월", "화", "수", "목", "금", "토"];

export const DURATION_LABEL: Record<string, string> = {
    a_under5: "5분 미만",
    b_5to10: "5~10분",
    c_10to20: "10~20분",
    d_over20: "20분 이상",
};

export const AGE_LABEL: Record<string, string> = {
    a_under3m: "3개월 미만",
    b_under1y: "3개월 ~ 1년",
    c_under3y: "1년 ~ 3년",
    d_over3y: "3년 이상",
};

function fmt(n: number, unit = ""): string {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억${unit}`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만${unit}`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천${unit}`;
    return `${n.toLocaleString()}${unit}`;
}

function byDesc<T>(rows: T[], key: (r: T) => number): T[] {
    return [...rows].sort((a, b) => key(b) - key(a));
}

/* ── 몇 시에 올려야 ─────────────────────────────────────────── */

export interface UploadTimeText {
    p1: string;
    p2: string;
    dowTitle: string;
    p3: string;
}

export function uploadTimeText(d: Insights): UploadTimeText {
    const hours = byDesc(d.upload_hour, (r) => r.median_views);
    const best = hours[0];
    const worst = hours[hours.length - 1];
    const busiest = byDesc(d.upload_hour, (r) => r.videos)[0];
    const dows = byDesc(d.day_of_week, (r) => r.median_views);
    const hourGap = best.median_views / worst.median_views;
    const dowGap = dows[0].median_views / dows[dows.length - 1].median_views;
    // 요일 격차가 시간대 격차의 절반(1을 뺀 몫 기준)도 안 될 때만 '중요하지 않다'고 쓴다.
    const dowSmall = dowGap - 1 <= (hourGap - 1) / 2;
    const hi = DOW_LABEL[dows[0].dow];
    const lo = DOW_LABEL[dows[dows.length - 1].dow];

    return {
        p1: `가장 성과가 좋은 시간대는 **${best.hour}시**로 중위 조회수 ${fmt(best.median_views, "회")}였고, ` +
            `가장 낮은 ${worst.hour}시(${fmt(worst.median_views, "회")})와 **${hourGap.toFixed(2)}배** 차이가 났습니다.`,
        p2: busiest.hour !== best.hour
            ? `흥미로운 건 **많이 올리는 시간과 잘 되는 시간이 다르다**는 점입니다. ` +
              `업로드가 가장 몰리는 시간은 ${busiest.hour}시(${busiest.videos.toLocaleString()}건)인데, ` +
              `중위 조회수는 ${fmt(busiest.median_views, "회")}로 ${best.hour}시보다 낮았습니다. ` +
              `경쟁이 몰리는 시간대를 피하는 것도 방법입니다.`
            : `업로드가 가장 몰리는 시간도 **${best.hour}시**(${busiest.videos.toLocaleString()}건)로, ` +
              `많이 올리는 시간과 잘 되는 시간이 겹칩니다.`,
        dowTitle: dowSmall ? "요일은 생각보다 중요하지 않습니다" : "요일에 따른 차이",
        p3: dowSmall
            ? `요일별 격차는 **${dowGap.toFixed(2)}배**에 그쳤습니다. 가장 높은 ${hi}요일과 가장 낮은 ${lo}요일의 ` +
              `차이가 크지 않다는 뜻입니다. 시간대에 비하면 영향이 훨씬 작으니, 요일을 맞추느라 업로드를 미루는 것보다 ` +
              `시간대를 지키는 편이 낫습니다.`
            : `요일별 격차는 **${dowGap.toFixed(2)}배**입니다. 가장 높은 ${hi}요일과 가장 낮은 ${lo}요일의 차이로, ` +
              `시간대 격차(${hourGap.toFixed(2)}배)와 함께 보는 편이 좋습니다.`,
    };
}

/* ── 숏츠와 롱폼 ─────────────────────────────────────────────── */

type Side = "long" | "short" | "same";
const NAME = { long: "롱폼", short: "숏츠" } as const;
const SUBJ = { long: "롱폼이", short: "숏츠가" } as const;

/** 둘 중 어느 쪽이 높은지. 5% 안쪽 차이는 비슷하다고 본다. */
function compare(longV: number, shortV: number): { who: Side; r: number } {
    const hi = Math.max(longV, shortV);
    const lo = Math.min(longV, shortV);
    const r = lo > 0 ? hi / lo : Infinity;
    if (r < 1.05) return { who: "same", r };
    return { who: longV > shortV ? "long" : "short", r };
}

/** '좋아요 비율은 …' 한 마디. 끝말(ending)만 바꿔 이어 붙인다. */
function rateClause(label: string, l: number, s: number, c: { who: Side; r: number }, ending: "다" | "고" | "지만"): string {
    if (c.who === "same") {
        return `${label} 비율은 롱폼 ${l}%, 숏츠 ${s}%로 비슷` + { 다: "했습니다", 고: "했고", 지만: "했지만" }[ending];
    }
    const [wv, lv] = c.who === "long" ? [l, s] : [s, l];
    const loser = NAME[c.who === "long" ? "short" : "long"];
    const head = `${label} 비율은 ${SUBJ[c.who]} ${wv}%로 ${loser}(${lv}%)`;
    if (c.r < 1.2) return `${head}보다 조금 높` + { 다: "았습니다", 고: "았고", 지만: "았지만" }[ending];
    return `${head}의 **${c.r.toFixed(1)}배**` + { 다: "였습니다", 고: "였고", 지만: "였지만" }[ending];
}

/** 요약용 짧은 꼴 (숫자 % 없이). */
function rateBrief(label: string, c: { who: Side; r: number }, ending: "다" | "고" | "지만"): string {
    if (c.who === "same") return `${label} 비율은 비슷` + { 다: "합니다", 고: "하고", 지만: "하지만" }[ending];
    const how = c.r < 1.2 ? "조금 더" : `${c.r.toFixed(1)}배`;
    return `${label} 비율은 ${SUBJ[c.who]} ${how} 높` + { 다: "습니다", 고: "고", 지만: "지만" }[ending];
}

export interface FormatText {
    p1: string;
    p2: string;
    /** 숏츠가 조회수에서 앞서고 롱폼이 반응에서 앞설 때만 있는 맺음 문단 */
    p3: string | null;
    durationBest: string;
    p4: string;
}

export function formatText(s: FormatRow, l: FormatRow, durations: DurationRow[]): FormatText {
    const v = compare(l.median_views, s.median_views);
    const like = compare(l.like_rate, s.like_rate);
    const com = compare(l.comment_rate, s.comment_rate);

    const p1 = v.who === "same"
        ? `조회수는 숏츠와 롱폼이 비슷합니다. 중위 조회수가 숏츠 **${fmt(s.median_views, "회")}**, 롱폼 ${fmt(l.median_views, "회")}입니다.`
        : v.who === "short"
            ? `조회수만 보면 숏츠가 ${v.r >= 2 ? "압도적입니다" : "앞섭니다"}. 중위 조회수가 **${fmt(s.median_views, "회")}**로 ` +
              `롱폼(${fmt(l.median_views, "회")})의 **${v.r.toFixed(1)}배**입니다.`
            : `조회수는 롱폼이 앞섭니다. 중위 조회수가 **${fmt(l.median_views, "회")}**로 ` +
              `숏츠(${fmt(s.median_views, "회")})의 **${v.r.toFixed(1)}배**입니다.`;

    // 반응: 댓글을 먼저 말한다. 둘이 다른 쪽 편을 들면 '…지만', 아니면 '…고'로 잇는다.
    const opposite = like.who !== "same" && com.who !== "same" && like.who !== com.who;
    const pair = `${rateClause("댓글", l.comment_rate, s.comment_rate, com, opposite ? "지만" : "고")}, ` +
        `${rateClause("좋아요", l.like_rate, s.like_rate, like, "다")}.`;
    let lead: string;
    if (like.who === com.who && like.who !== "same") {
        const w = like.who;
        lead = w === "long" && v.who === "short"
            ? "그런데 **반응의 깊이는 정반대**입니다."
            : w === v.who ? `반응도 ${SUBJ[w]} 앞섭니다.` : `그런데 반응은 ${SUBJ[w]} 앞섭니다.`;
    } else if (like.who === "same" && com.who === "same") {
        lead = "반응은 비슷합니다.";
    } else {
        lead = "반응은 갈렸습니다.";
    }

    let p3: string | null = null;
    if (v.who === "short" && (like.who === "long" || com.who === "long")) {
        const both = like.who === "long" && com.who === "long";
        const what = both ? "롱폼은 **깊게 남습니다**"
            : com.who === "long" ? "롱폼은 **조회수에 비해 댓글이 많습니다**" : "롱폼은 **조회수에 비해 좋아요가 많습니다**";
        p3 = `숏츠는 **넓게 퍼지고**, ${what}. 구독 전환이나 팬덤을 원한다면 조회수 숫자만 보고 판단하면 안 됩니다.`;
    }

    // 롱폼 길이: 가장 높은 구간을 데이터에서 고른다.
    const durs = byDesc(durations, (r) => r.median_views);
    const top = durs[0];
    const label = DURATION_LABEL[top.bucket] ?? top.bucket;
    const rest = durs.slice(1).map((r) => r.median_views);
    const flatAfter5 = top.bucket === "a_under5" && rest.length > 0 && Math.max(...rest) / Math.min(...rest) < 1.2;
    const longest = durations.find((r) => r.bucket === "d_over20");
    let p4: string;
    if (top.bucket === "d_over20") {
        p4 = `이번 표본에서는 그렇습니다. **20분 이상**이 중위 ${fmt(top.median_views, "회")}로 가장 높았습니다.`;
    } else if (flatAfter5) {
        p4 = `아닙니다. **5분 미만**이 중위 ${fmt(top.median_views, "회")}로 가장 높았고, 5분을 넘기면 길이에 따른 차이가 ` +
            `거의 사라집니다. 20분짜리를 만든다고 20분만큼 보상받지는 않는다는 뜻입니다.`;
    } else {
        p4 = `아닙니다. **${label}**이 중위 ${fmt(top.median_views, "회")}로 가장 높았` +
            (longest ? `고, 20분 이상은 ${fmt(longest.median_views, "회")}였습니다.` : "습니다.");
    }

    return { p1, p2: `${lead} ${pair}`, p3, durationBest: top.bucket, p4 };
}

/* ── 채널 나이 ───────────────────────────────────────────────── */

export interface ChannelAgeText {
    best: ChannelAgeRow;
    p1: string;
    p2: string | null;
    tableTitle: string;
    p3: string;
}

export function channelAgeText(ages: ChannelAgeRow[]): ChannelAgeText {
    const sorted = byDesc(ages, (r) => r.avg_daily_views);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const oldest = ages.find((a) => a.bucket === "d_over3y");
    const maxSubs = byDesc(ages, (r) => r.median_subs)[0];
    const age = (r: ChannelAgeRow) => AGE_LABEL[r.bucket] ?? r.bucket;

    const verdict = best.bucket === "a_under3m" || best.bucket === "b_under1y"
        ? "데이터는 반대였습니다."
        : best.bucket === "d_over3y" ? "이번 표본에서는 오래된 채널이 앞섰습니다." : "데이터로 보면 오래될수록 유리하지는 않았습니다.";
    const p1 = `“지금 시작하면 늦었다”는 말을 자주 듣습니다. ${verdict} 일평균 조회수가 가장 높은 구간은 ` +
        `**${age(best)}** 채널로 ${fmt(best.avg_daily_views, "회")}였습니다.`;

    let p2: string | null = null;
    if (oldest && oldest.bucket !== best.bucket) {
        p2 = `반면 **3년 이상** 된 채널은 ${fmt(oldest.avg_daily_views, "회")}로 ` +
            `${oldest.bucket === worst.bucket ? "가장 낮았습니다" : "그보다 낮았습니다"}. ` +
            `${age(best)} 구간이 **약 ${(best.avg_daily_views / oldest.avg_daily_views).toFixed(1)}배** 높은 셈입니다.` +
            (oldest.median_subs > best.median_subs ? " 구독자는 오래된 채널이 더 많은데도 그렇습니다." : "") +
            (worst.bucket !== oldest.bucket && worst.bucket !== best.bucket
                ? ` 가장 낮은 구간은 ${age(worst)} 채널(${fmt(worst.avg_daily_views, "회")})이었습니다.`
                : "");
    }

    const subsLead = maxSubs.bucket !== best.bucket;
    return {
        best,
        p1,
        p2,
        tableTitle: subsLead ? "구독자가 많다고 조회수가 따라오지 않습니다" : "채널 나이별 구독자와 조회수",
        p3: subsLead
            ? `중위 구독자가 가장 많은 구간은 ${age(maxSubs)}(${maxSubs.median_subs.toLocaleString()}명)이지만, ` +
              `일평균 조회수는 ${age(best)} 구간이 가장 높습니다. 알고리즘이 채널의 연차가 아니라 ` +
              `**지금 이 영상의 반응**을 본다는 뜻으로 읽힙니다.`
            : `중위 구독자도 ${age(best)} 구간이 ${best.median_subs.toLocaleString()}명으로 가장 많습니다. ` +
              `이번 표본에서는 구독자가 많은 구간이 조회수도 높았습니다.`,
    };
}

/* ── 목록·검색 결과에 쓰는 한 줄 요약 ────────────────────────── */

export function reportSummary(slug: string, d: Insights): string | null {
    if (slug === "upload-time") {
        const hours = byDesc(d.upload_hour, (r) => r.median_views);
        const dows = byDesc(d.day_of_week, (r) => r.median_views);
        if (!hours.length || !dows.length) return null;
        const hourGap = (hours[0].median_views / hours[hours.length - 1].median_views).toFixed(1);
        const dowGap = (dows[0].median_views / dows[dows.length - 1].median_views).toFixed(1);
        // 소수 한 자리로 같아 보이면 '작다/크다' 대신 '비슷하다'로 쓴다.
        const dow = dowGap === hourGap ? `요일 차이도 ${dowGap}배로 비슷합니다.`
            : Number(dowGap) < Number(hourGap) ? `요일 차이는 ${dowGap}배로 그보다 작습니다.` : `요일 차이는 ${dowGap}배로 시간대보다 큽니다.`;
        return `업로드 시간대에 따라 중위 조회수가 ${hourGap}배까지 갈립니다(가장 높은 시간은 ${hours[0].hour}시). ${dow}`;
    }
    if (slug === "shorts-vs-longform") {
        const s = d.format.find((f) => f.format === "shorts");
        const l = d.format.find((f) => f.format === "longform");
        if (!s || !l) return null;
        const v = compare(l.median_views, s.median_views);
        const like = compare(l.like_rate, s.like_rate);
        const com = compare(l.comment_rate, s.comment_rate);
        const views = v.who === "same"
            ? "숏츠와 롱폼의 중위 조회수는 비슷합니다."
            : `${NAME[v.who]}의 중위 조회수가 ${NAME[v.who === "long" ? "short" : "long"]}의 ${v.r.toFixed(1)}배입니다.`;
        const opposite = like.who !== "same" && com.who !== "same" && like.who !== com.who;
        const react = like.who === com.who
            ? (like.who === "same" ? "좋아요·댓글 비율은 비슷합니다." : `좋아요·댓글 비율은 ${SUBJ[like.who]} 더 높습니다.`)
            : `${rateBrief("댓글", com, opposite ? "지만" : "고")}, ${rateBrief("좋아요", like, "다")}.`;
        return `${views} ${react}`;
    }
    if (slug === "channel-age") {
        if (d.channel_age.length < 2) return null;
        const sorted = byDesc(d.channel_age, (r) => r.avg_daily_views);
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];
        return `일평균 조회수는 ${AGE_LABEL[best.bucket] ?? best.bucket} 채널이 가장 높고 ` +
            `${AGE_LABEL[worst.bucket] ?? worst.bucket} 채널이 가장 낮아, 약 ` +
            `${(best.avg_daily_views / worst.avg_daily_views).toFixed(1)}배 차이가 납니다.`;
    }
    return null;
}
