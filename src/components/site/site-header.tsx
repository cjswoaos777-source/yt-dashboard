"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 사이트 머리 메뉴 (2026-10-30 새 디자인). 예전 왼쪽 사이드바를 대신한다.
 *
 * 사이드바에 있던 링크(벤치마킹·구독자 구간·태그·인사이트·공지·소개)는 '더보기'와
 * 바닥글로 모두 남긴다. 내부 링크를 줄이지 않기 위해서다 (SEO 점검 10-30).
 * 휴대폰에서는 메뉴 줄을 옆으로 넘기고, '더보기' 대신 바닥글을 쓴다.
 */
const MAIN = [
    { href: "/dashboard", label: "지금 뜨는 영상", match: (p: string) => p === "/dashboard" },
    { href: "/channel", label: "떠오르는 채널", match: (p: string) => p === "/channel" || p.startsWith("/channel/") },
    { href: "/category", label: "카테고리", match: (p: string) => p.startsWith("/category") },
    { href: "/ideas", label: "만들 만한 영상", match: (p: string) => p.startsWith("/ideas") },
    { href: "/report", label: "주간 리포트", match: (p: string) => p.startsWith("/report") },
];
const MORE = [
    { href: "/dashboard/benchmarking", label: "벤치마킹" },
    { href: "/tier", label: "구독자 구간" },
    { href: "/tag", label: "태그" },
    { href: "/insights", label: "인사이트" },
    { href: "/notice", label: "공지사항" },
    { href: "/about", label: "소개" },
];

export function SiteHeader() {
    const path = usePathname() ?? "/";
    return (
        <header className="vh-head">
            <div className="vh-head-in">
                <Link href="/" className="vh-logo" aria-label="Viral Hunter 홈">
                    <span className="vh-logo-mark" aria-hidden="true" />
                    Viral Hunter
                </Link>
                <nav className="vh-nav" aria-label="주요 메뉴">
                    {MAIN.map((m) => (
                        <Link key={m.href} href={m.href} aria-current={m.match(path) ? "page" : undefined}>
                            {m.label}
                        </Link>
                    ))}
                    <Link href="/about#support" className="vh-nav-support">☕ 후원</Link>
                </nav>
                <details className="vh-navmore">
                    <summary>더보기</summary>
                    <div>
                        {MORE.map((m) => (
                            <Link key={m.href} href={m.href}>
                                {m.label}
                            </Link>
                        ))}
                    </div>
                </details>
                <Link href="/about#support" className="vh-support-link">
                    ☕ 후원하기
                </Link>
            </div>
        </header>
    );
}
