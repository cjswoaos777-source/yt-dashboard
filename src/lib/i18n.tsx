"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { currentPageType, track } from "@/lib/analytics";

/**
 * 화면 글자 영어 전환 (2026-11-04, 사용자 결정: 메뉴·필터·안내 글자만).
 *
 * 검색에 영향을 주지 않게 지키는 규칙:
 *   · 새 주소를 만들지 않는다. 서버가 그리는 HTML 은 언제나 한국어다.
 *   · 버튼을 눌렀을 때만 바꾼다. 브라우저 언어나 나라를 보고 자동으로 바꾸지 않는다.
 *     구글 로봇은 보통 미국에서 언어 설정 없이 오므로, 자동으로 바꾸면 로봇에게 영어 화면이 보일 수 있다.
 *   · 영어 글자는 i18n-en.ts 에 따로 두고 영어를 고른 사람만 받는다.
 *   · 영상 제목·채널 이름·본문 해설은 번역하지 않는다 (YouTube API 정책 III.C.5, III.I.4). 숫자는 표기만 바꾼다.
 *
 * 번역이 없는 글자는 한국어로 나온다. 메뉴·필터 문구를 새로 넣으면 i18n-en.ts 에도 넣는다.
 */

export type UiLang = "ko" | "en";

const STORAGE_KEY = "vh-ui-lang";

const LangContext = createContext<{
    uiLang: UiLang;
    dict: Record<string, string> | null;
    setUiLang: (next: UiLang) => void;
}>({ uiLang: "ko", dict: null, setUiLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
    // 첫 화면은 서버와 같게 한국어로 그린 뒤, 저장해 둔 선택이 있을 때만 바꾼다.
    const [uiLang, setLang] = useState<UiLang>("ko");
    const [dict, setDict] = useState<Record<string, string> | null>(null);

    useEffect(() => {
        let saved: string | null = null;
        try {
            saved = window.localStorage.getItem(STORAGE_KEY);
        } catch {
            // 저장소를 못 쓰는 브라우저는 한국어로 시작한다.
        }
        // 첫 그림을 서버와 맞춘 뒤 저장된 선택을 읽어야 해서 효과 안에서 바꾼다.
        if (saved === "en") setLang("en");
    }, []);

    useEffect(() => {
        document.documentElement.lang = uiLang;
        if (uiLang !== "en") return;
        let stale = false;
        import("@/lib/i18n-en").then((m) => {
            if (!stale) setDict(m.EN);
        });
        return () => { stale = true; };
    }, [uiLang]);

    const setUiLang = useCallback((next: UiLang) => {
        setLang(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // 저장하지 못해도 이번 화면에서는 바뀐다.
        }
        track("language_change", { language: next, page_type: currentPageType() });
    }, []);

    const value = useMemo(() => ({ uiLang, dict, setUiLang }), [uiLang, dict, setUiLang]);
    return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useUiLang() {
    const { uiLang, setUiLang } = useContext(LangContext);
    return { uiLang, setUiLang };
}

/** 한국어 글자를 그대로 열쇠로 쓴다. 영어가 아니거나 번역이 없으면 한국어를 돌려준다. */
export function useT() {
    const { uiLang, dict } = useContext(LangContext);
    return useCallback((ko: string) => (uiLang === "en" && dict?.[ko]) || ko, [uiLang, dict]);
}

const EN_COMPACT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** 큰 숫자 표기. 한국어는 1.2만회, 영어는 12K. 값은 같고 표기만 다르다. */
export function fmtCount(n: number, uiLang: UiLang, unit = ""): string {
    if (uiLang === "en") return EN_COMPACT.format(n ?? 0);
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억${unit}`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만${unit}`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천${unit}`;
    return `${n.toLocaleString("ko-KR")}${unit}`;
}
