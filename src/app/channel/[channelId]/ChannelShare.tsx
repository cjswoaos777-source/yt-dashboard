"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

/**
 * '이 채널 성과 공유하기' 상자.
 *
 * [2026-10-16] 채널 주인·팬이 링크를 퍼뜨리게 하려는 장치다. 링크를 붙이면
 * opengraph-image.tsx 의 성과 카드가 미리보기로 뜬다. 블로그 배지 코드는
 * 그 카드 이미지를 링크로 감싼 것이라, 붙인 곳마다 이 페이지로 오는 외부 링크가 생긴다.
 *
 * 공유 버튼마다 GA 'share' 이벤트를 method 와 함께 보낸다 (analytics.ts).
 */
export function ChannelShare({
    channelId,
    pageUrl,
    shareText,
    channelTitle,
}: {
    channelId: string;
    pageUrl: string;
    shareText: string;
    channelTitle: string;
}) {
    const [copied, setCopied] = useState<null | "link" | "badge">(null);
    const imageUrl = `${pageUrl}/opengraph-image`;
    const badgeHtml =
        `<a href="${pageUrl}" target="_blank" rel="noopener">` +
        `<img src="${imageUrl}" alt="${channelTitle.replace(/"/g, "&quot;")} 채널 성과 — Viral Hunter" width="600" /></a>`;

    function done(kind: "link" | "badge") {
        setCopied(kind);
        setTimeout(() => setCopied(null), 2000);
    }

    async function copy(text: string, kind: "link" | "badge") {
        track("share", { page_type: "channel", method: kind === "link" ? "copy_link" : "copy_badge" });
        try {
            await navigator.clipboard.writeText(text);
            done(kind);
        } catch {
            // 클립보드 권한이 없는 브라우저 — 조용히 넘어간다
        }
    }

    // 휴대폰에서는 시스템 공유 창(카카오톡 등)이 뜬다. 지원하지 않는 브라우저는 링크 복사로 대신한다.
    // (지원 여부로 버튼을 숨기면 서버 렌더와 브라우저 렌더가 달라져 hydration 경고가 난다)
    async function nativeShare() {
        if (typeof navigator.share !== "function") return copy(pageUrl, "link");
        track("share", { page_type: "channel", method: "native" });
        try {
            await navigator.share({ title: shareText, text: shareText, url: pageUrl });
        } catch {
            // 사용자가 취소했거나 지원하지 않음
        }
    }

    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`;
    const btn = "vh-btn-ghost";

    return (
        <section className="vh-card vh-share">
            <h2>📣 이 채널 성과 공유하기</h2>
            <p className="vh-share-lead">
                채널 주인이라면 시청자에게, 팬이라면 친구에게 자랑해 보세요. 링크를 붙이면 아래 카드가 미리보기로 떠요.
            </p>

            {/* 미리보기. CDN 에 보관되는 이미지라 반복 조회 비용은 작다(next.config). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={`/channel/${channelId}/opengraph-image`}
                alt={`${channelTitle} 채널 성과 카드`}
                width={1200}
                height={630}
                loading="lazy"
                className="vh-share-img"
            />

            <div className="vh-share-btns">
                <button type="button" onClick={nativeShare} className={btn}>
                    📲 공유하기
                </button>
                <button type="button" onClick={() => copy(pageUrl, "link")} className={btn}>
                    {copied === "link" ? "✅ 링크 복사됨" : "🔗 링크 복사"}
                </button>
                <a
                    href={xUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track("share", { page_type: "channel", method: "x" })}
                    className={btn}
                >
                    𝕏 X에 올리기
                </a>
                <a
                    href={`/channel/${channelId}/opengraph-image`}
                    download={`${channelTitle}-viral-hunter.png`}
                    onClick={() => track("share", { page_type: "channel", method: "download_image" })}
                    className={btn}
                >
                    🖼️ 카드 이미지 저장
                </a>
                <button type="button" onClick={() => copy(badgeHtml, "badge")} className={btn}>
                    {copied === "badge" ? "✅ 배지 코드 복사됨" : "🧩 블로그 배지 코드 복사"}
                </button>
            </div>
            <p className="vh-share-note">
                블로그 배지 코드는 HTML을 붙일 수 있는 블로그(티스토리 등)에 넣으면 카드 이미지가 이 페이지 링크와 함께 보입니다.
            </p>
        </section>
    );
}
