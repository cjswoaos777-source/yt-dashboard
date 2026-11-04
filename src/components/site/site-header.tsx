"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT, useUiLang } from "@/lib/i18n";

/**
 * 사이트 머리 메뉴 (2026-10-30 새 디자인). 예전 왼쪽 사이드바를 대신한다.
 *
 * 사이드바에 있던 링크(구독자 구간·태그·인사이트·공지·소개)는 '더보기'와
 * 바닥글로 모두 남긴다. 내부 링크를 줄이지 않기 위해서다 (SEO 점검 10-30).
 * [2026-10-31] 더보기의 벤치마킹을 '지금 뜨는 채널'로 이름을 바꿔 지금 뜨는 영상 옆에 올렸다
 * (사용자 결정). 예전 '떠오르는 채널'(필터 없는 표)도 같은 화면(/channel)으로 합쳤다.
 * 휴대폰에서는 메뉴 줄을 옆으로 넘기고, '더보기' 대신 바닥글을 쓴다.
 */
const MAIN = [
    { href: "/dashboard", label: "지금 뜨는 영상", match: (p: string) => p === "/dashboard" },
    { href: "/channel", label: "지금 뜨는 채널", match: (p: string) => p === "/channel" || p.startsWith("/channel/") },
    { href: "/category", label: "카테고리", match: (p: string) => p.startsWith("/category") },
    { href: "/ideas", label: "만들 만한 영상", match: (p: string) => p.startsWith("/ideas") },
    { href: "/report", label: "주간 리포트", match: (p: string) => p.startsWith("/report") },
];
const MORE = [
    { href: "/tier", label: "구독자 구간" },
    { href: "/tag", label: "태그" },
    { href: "/insights", label: "인사이트" },
    { href: "/notice", label: "공지사항" },
    { href: "/about", label: "소개" },
];

/** 버튼을 눌렀을 때만 바꾼다. 자동으로 바꾸지 않는다 (이유는 lib/i18n.tsx). */
function LangToggle() {
    const { uiLang, setUiLang } = useUiLang();
    const next = uiLang === "en" ? "ko" : "en";
    return (
        <button type="button" className="vh-lang" lang={next} onClick={() => setUiLang(next)}>
            {next === "en" ? "English" : "한국어"}
        </button>
    );
}

export function SiteHeader() {
    const path = usePathname() ?? "/";
    const t = useT();
    return (
        <header className="vh-head">
            <div className="vh-head-in">
                <Link href="/" className="vh-logo" aria-label={t("Viral Hunter 홈")}>
                    <span className="vh-logo-mark" aria-hidden="true" />
                    Viral Hunter
                </Link>
                <nav className="vh-nav" aria-label={t("주요 메뉴")}>
                    {MAIN.map((m) => (
                        <Link key={m.href} href={m.href} aria-current={m.match(path) ? "page" : undefined}>
                            {t(m.label)}
                        </Link>
                    ))}
                    <Link href="/about#support" className="vh-nav-support">{t("☕ 후원")}</Link>
                </nav>
                <details className="vh-navmore">
                    <summary>{t("더보기")}</summary>
                    <div>
                        {MORE.map((m) => (
                            <Link key={m.href} href={m.href}>
                                {t(m.label)}
                            </Link>
                        ))}
                    </div>
                </details>
                <Link href="/about#support" className="vh-support-link">
                    {t("☕ 후원하기")}
                </Link>
                <LangToggle />
            </div>
        </header>
    );
}
