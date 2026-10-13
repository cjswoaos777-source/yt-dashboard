"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track, pageTypeOf, currentPageType } from "@/lib/analytics";

/**
 * 사이트 전체에 한 번만 붙는 GA 추적기 (루트 layout).
 *
 * 1. page_view 를 직접 보낸다 (page_type 을 붙이려고).
 *    gtag config 는 send_page_view:false 이고, GA 의 향상된 측정에서
 *    '브라우저 기록 이벤트 기반 페이지 변경'도 꺼 두어야 두 번 세지 않는다.
 *    경로(pathname)가 바뀔 때만 보낸다 — 필터를 누르면 주소의 ?쿼리만 바뀌는데
 *    그걸 페이지 조회로 세면 조회수가 부풀려진다.
 *    제목(document.title)이 새 페이지 것으로 바뀐 뒤 보내려고 잠깐 기다린다.
 *
 * 2. 링크 클릭을 한 곳에서 잡는다. 유튜브로 나가는 링크가 여러 컴포넌트에
 *    흩어져 있어 하나하나 붙이는 대신 문서 전체의 클릭을 본다.
 */
export function AnalyticsTracker() {
    const pathname = usePathname();

    useEffect(() => {
        const t = setTimeout(() => {
            track("page_view", {
                page_type: pageTypeOf(pathname),
                page_location: window.location.href,
                page_title: document.title,
            });
        }, 300);
        return () => clearTimeout(t);
    }, [pathname]);

    useEffect(() => {
        function onClick(e: MouseEvent) {
            const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
            if (!a) return;
            let url: URL;
            try {
                url = new URL(a.href, window.location.href);
            } catch {
                return;
            }
            if (/(^|\.)youtube\.com$/.test(url.hostname) || url.hostname === "youtu.be") {
                // 약관 링크 같은 건 유튜브로 '보러 간' 클릭이 아니다.
                const linkType = url.pathname.startsWith("/watch") || url.pathname.startsWith("/shorts")
                    ? "video"
                    : url.pathname.startsWith("/channel") || url.pathname.startsWith("/@")
                      ? "channel"
                      : null;
                if (linkType) track("youtube_click", { link_type: linkType, page_type: currentPageType() });
                return;
            }
            if (url.origin === window.location.origin && url.pathname.startsWith("/channel/")) {
                track("channel_open", { page_type: currentPageType() });
            }
        }
        document.addEventListener("click", onClick, { capture: true });
        return () => document.removeEventListener("click", onClick, { capture: true });
    }, []);

    return null;
}
