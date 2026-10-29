/**
 * GA4 이벤트 보내기.
 *
 * [2026-10-13] 기본 수집(page_view·scroll·click)만으로는 "어떤 필터를 쓰는지",
 * "유튜브로 몇 번 나가는지"를 알 수 없어 의미 있는 이벤트를 직접 보낸다.
 * 이벤트 이름·파라미터를 바꾸면 GA 의 맞춤 측정기준·주요 이벤트 등록도 같이 바꿔야 한다.
 *
 *   page_view     page_type        페이지 종류 (아래 pageTypeOf)
 *   youtube_click link_type        video | channel  (유튜브로 나간 클릭 — 주요 이벤트)
 *   channel_open  page_type        사이트 안에서 채널 상세로 넘어간 클릭
 *   filter_change board, filter_name, filter_value
 *   share         page_type        공유(주소 복사) 버튼 — 주요 이벤트
 *   report_subscribe page_type, frequency  리포트 메일 신청 (확인 메일 전 단계)
 *
 * gtag 스크립트는 afterInteractive 로 늦게 뜨므로, 아직 없으면 잠깐 기다렸다 보낸다.
 * 광고 차단 등으로 끝내 없으면 조용히 버린다 (화면 동작에는 영향이 없어야 한다).
 */

type Params = Record<string, string | number | boolean | undefined>;

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
    }
}

export function track(event: string, params: Params = {}, attempt = 0): void {
    if (typeof window === "undefined") return;
    if (typeof window.gtag === "function") {
        window.gtag("event", event, params);
        return;
    }
    if (attempt < 10) setTimeout(() => track(event, params, attempt + 1), 500);
}

/** 경로 → 페이지 종류. GA 보고서에서 '페이지 종류별 조회수'의 기준이다. */
export function pageTypeOf(path: string): string {
    if (path === "/") return "home";
    if (path === "/dashboard") return "ranking";
    if (path.startsWith("/dashboard/benchmarking")) return "benchmarking";
    if (path === "/channel") return "channel_hub";
    if (path.startsWith("/channel/")) return "channel";
    if (path.startsWith("/tag")) return "tag";
    if (path.startsWith("/tier")) return "tier";
    if (path.startsWith("/insights")) return "insights";
    if (path.startsWith("/ideas")) return "ideas";
    if (path.startsWith("/report")) return "report";
    if (path.startsWith("/subscribe")) return "subscribe";
    if (path.startsWith("/notice")) return "notice";
    if (path.startsWith("/about")) return "about";
    if (path.startsWith("/privacy") || path.startsWith("/terms")) return "legal";
    return "other";
}

/** 지금 페이지의 종류 (이벤트 파라미터용) */
export function currentPageType(): string {
    return typeof window === "undefined" ? "other" : pageTypeOf(window.location.pathname);
}
