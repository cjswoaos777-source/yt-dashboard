/**
 * 채널 분석 문장 — channel_recent.insight 로 '이 채널은 어떤 채널인가'를 쓴다.
 *
 * [2026-10-21] 구글이 채널 페이지를 '같은 틀에 숫자만 다른 페이지'로 보고 색인하지 않는다.
 * 숫자만 바꿔 끼우는 문장이 아니라, 채널의 상태에 따라 나오는 문장 자체가 달라지게 한다
 * (숏츠 전용인지, 한 방형인지 꾸준형인지, 비슷한 채널보다 잘 나오는지 등).
 * 비교 값은 파이프라인이 계산한다 (utube_rank/sync_supabase._build_insights).
 * 대상은 사이트맵 채널뿐이라 다른 채널은 insight 가 없다.
 *
 * 백분위(pct)는 '상위 몇 %'다 — 작을수록 좋다.
 */

export interface ChannelInsight {
    peer: { label: string; n: number };
    days_seen: number;
    /** 처음~마지막 등장까지 일수 */
    span: number | null;
    /** 최근 30일 포착 영상 수 (3개 미만이면 영상 관련 값이 없다) */
    n?: number;
    shorts?: number;
    /** 포착 영상 조회수 중간값 (업로드 후 약 2일 기준) */
    med?: number;
    mx?: number;
    /** 중간값 ÷ 구독자 */
    med_ratio?: number;
    med_pct?: number;
    /** 최고 ÷ 중간값 (영상 5개 이상일 때) */
    hit?: number;
    sh_med?: number;
    lf_med?: number;
    time?: { label: string; k: number };
    pub_days?: number;
    like?: number;
    like_pct?: number;
    growth?: { rate: number; days: number; pct?: number };
}

export interface InsightView {
    tags: string[];
    sentences: string[];
}

function fmt(n: number, unit = ""): string {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억${unit}`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만${unit}`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천${unit}`;
    return `${n.toLocaleString()}${unit}`;
}

function times(x: number): string {
    return x >= 10 ? `${Math.round(x)}배` : `${x.toFixed(1)}배`;
}

function pctText(rate: number): string {
    const p = rate * 100;
    return `${p > 0 ? "+" : ""}${Math.abs(p) >= 10 ? p.toFixed(0) : p.toFixed(1)}%`;
}

export function buildInsight(i: ChannelInsight, subs: number): InsightView {
    const tags: string[] = [];
    const s: string[] = [];
    const peer = `${i.peer.label} ${i.peer.n.toLocaleString()}개`;

    // ① 비슷한 채널과 비교한 조회수
    if (i.med != null && i.med_pct != null) {
        const head = `${peer} 가운데 이 채널 영상의 초반 조회수(업로드 후 약 2일, 중간값 ${fmt(i.med, "회")})는 상위 ${i.med_pct}%입니다.`;
        if (i.med_pct <= 10) {
            tags.push(`조회수 상위 ${i.med_pct}%`);
            s.push(`${head} 비슷한 규모에서 손꼽히게 잘 나오는 채널입니다.`);
        } else if (i.med_pct <= 30) {
            tags.push(`조회수 상위 ${i.med_pct}%`);
            s.push(`${head} 비슷한 규모 채널보다 잘 나오는 편입니다.`);
        } else if (i.med_pct >= 70) {
            s.push(`${head} 비슷한 규모 채널 중에서는 낮은 편입니다.`);
        } else {
            s.push(`${head} 비슷한 규모 채널 중 중간 수준입니다.`);
        }
    }

    // ② 구독자 대비 조회수
    if (i.med_ratio != null && subs > 0) {
        if (i.med_ratio >= 1.5) {
            s.push(`영상 한 편이 업로드 후 이틀 안에 구독자 수의 약 ${times(i.med_ratio)}에 이르는 조회수를 냅니다. 구독자가 아닌 시청자도 많이 본다는 뜻입니다.`);
        } else if (i.med_ratio >= 0.5) {
            s.push(`영상 한 편의 초반 조회수는 구독자 수와 비슷한 수준(약 ${times(i.med_ratio)})입니다.`);
        } else {
            s.push(`영상 한 편의 초반 조회수는 구독자 수의 약 ${Math.round(i.med_ratio * 100)}% 수준이라, 주로 기존 구독자가 보는 채널입니다.`);
        }
    }

    // ③ 형식
    if (i.n != null && i.shorts != null) {
        const long = i.n - i.shorts;
        if (i.shorts === i.n) {
            tags.push("숏츠 전용");
            s.push(`최근 30일 포착된 영상 ${i.n}개가 모두 숏츠인 숏츠 전용 채널입니다.`);
        } else if (i.shorts === 0) {
            tags.push("롱폼 전용");
            s.push(`최근 30일 포착된 영상 ${i.n}개가 모두 롱폼입니다.`);
        } else if (i.sh_med && i.lf_med) {
            const r = i.sh_med / i.lf_med;
            if (r >= 1.5) {
                tags.push("숏츠가 강세");
                s.push(`숏츠 ${i.shorts}개와 롱폼 ${long}개를 함께 올리는데, 숏츠(중간 ${fmt(i.sh_med, "회")})가 롱폼(중간 ${fmt(i.lf_med, "회")})보다 약 ${times(r)} 잘 나옵니다.`);
            } else if (r <= 1 / 1.5) {
                tags.push("롱폼이 강세");
                s.push(`숏츠 ${i.shorts}개와 롱폼 ${long}개를 함께 올리는데, 롱폼(중간 ${fmt(i.lf_med, "회")})이 숏츠(중간 ${fmt(i.sh_med, "회")})보다 약 ${times(1 / r)} 잘 나옵니다.`);
            } else {
                tags.push("숏츠·롱폼 병행");
                s.push(`숏츠 ${i.shorts}개와 롱폼 ${long}개를 함께 올리며, 두 형식의 조회수가 비슷합니다.`);
            }
        } else {
            tags.push("숏츠·롱폼 병행");
            s.push(`최근 30일 숏츠 ${i.shorts}개와 롱폼 ${long}개가 포착됐습니다.`);
        }
    }

    // ④ 한 방형 / 꾸준형
    if (i.hit != null && i.mx != null) {
        if (i.hit >= 8) {
            tags.push("한 방형");
            s.push(`가장 많이 본 영상(${fmt(i.mx, "회")})이 이 채널 평소 조회수의 약 ${times(i.hit)}입니다. 평소보다 한 편이 크게 터지는 '한 방형' 채널입니다.`);
        } else if (i.hit <= 2.5) {
            tags.push("꾸준형");
            s.push(`가장 잘된 영상도 평소의 ${times(i.hit)} 정도라, 영상마다 성과가 고른 '꾸준형' 채널입니다.`);
        } else {
            s.push(`가장 많이 본 영상(${fmt(i.mx, "회")})은 평소 조회수의 약 ${times(i.hit)}였습니다.`);
        }
    }

    // ⑤ 업로드 습관
    if (i.time && i.n != null) {
        tags.push(`${i.time.label.replace(/\(.*\)/, "")} 업로드`);
        s.push(
            i.time.k === i.n
                ? `포착된 영상 ${i.n}개를 모두 ${i.time.label}에 올렸습니다.`
                : `포착된 영상 ${i.n}개 중 ${i.time.k}개를 ${i.time.label}에 올렸습니다.`,
        );
    }
    if (i.pub_days != null && i.pub_days >= 15) {
        tags.push("거의 매일 업로드");
        s.push(`최근 30일 중 ${i.pub_days}일에 새 영상이 포착될 만큼 자주 올립니다.`);
    }

    // ⑥ 시청자 반응
    if (i.like != null && i.like_pct != null) {
        const lr = `${(i.like * 100).toFixed(1)}%`;
        if (i.like_pct <= 20) {
            tags.push("반응 좋음");
            s.push(`조회수 대비 좋아요 비율이 ${lr}로 비슷한 채널 중 상위 ${i.like_pct}%입니다. 보는 사람의 반응이 강한 편입니다.`);
        } else if (i.like_pct >= 80) {
            s.push(`조회수 대비 좋아요 비율(${lr})은 비슷한 채널보다 낮은 편입니다.`);
        }
    }

    // ⑦ 구독자 성장
    if (i.growth) {
        const g = i.growth;
        if (g.rate > 0 && g.pct != null && g.pct <= 20) {
            tags.push("빠른 성장");
            s.push(`최근 ${g.days}일 구독자가 ${pctText(g.rate)} 늘어, 비슷한 채널 중 상위 ${g.pct}% 성장 속도입니다.`);
        } else if (g.pct != null) {
            s.push(`최근 ${g.days}일 구독자 변화는 ${pctText(g.rate)}로, 비슷한 채널 중 상위 ${g.pct}%입니다.`);
        }
    }

    // ⑧ 순위 등장 패턴
    if (i.span && i.span >= i.days_seen) {
        const ratio = i.days_seen / i.span;
        if (ratio >= 0.8) {
            tags.push("순위 단골");
            s.push(`처음 급상승 순위에 오른 뒤 ${i.span}일 중 ${i.days_seen}일을 순위에 머문 단골 채널입니다.`);
        } else if (ratio < 0.4) {
            s.push(`처음 순위에 오른 뒤 ${i.span}일 중 ${i.days_seen}일 순위에 올랐습니다. 영상이 뜰 때마다 다시 들어오는 유형입니다.`);
        } else {
            s.push(`처음 순위에 오른 뒤 ${i.span}일 중 ${i.days_seen}일 순위에 올랐습니다.`);
        }
    }

    return { tags, sentences: s };
}
