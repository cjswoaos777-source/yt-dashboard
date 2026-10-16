import { ImageResponse } from "next/og";
import { getChannel, daysSinceKst } from "@/lib/channels";

/**
 * 채널 성과 카드 (1200×630).
 *
 * [2026-10-16] 채널 링크를 카톡·커뮤니티·X 에 붙이면 미리보기로 이 카드가 뜬다.
 * 채널 주인이 자기 성과를 자랑하며 링크를 퍼뜨리게 하려는 장치다 — 검색 유입은
 * 채널 이름 검색이 거의 전부였고, 색인 회복에는 외부 링크가 가장 필요하다.
 * 채널 페이지의 '카드 이미지 저장'·'블로그 배지'도 이 이미지를 쓴다.
 *
 * 유튜브 썸네일은 넣지 않는다. 우리가 계산한 지표와 공개 수치만 담고,
 * YouTube 가 보증하는 수치로 읽히지 않게 'Viral Hunter 자체 집계'를 밝힌다(정책 III.E.4.h).
 *
 * 한글 글꼴은 Google Fonts 에서 이 카드에 쓰이는 글자만 잘라 받는다(text= 서브셋, 수십 KB).
 */

export const alt = "Viral Hunter 채널 성과 카드";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function fmtKr(n: number, unit = ""): string {
    const abs = Math.abs(n);
    if (abs >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억${unit}`;
    if (abs >= 10_000) return `${(n / 10_000).toFixed(1)}만${unit}`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}천${unit}`;
    return `${n.toLocaleString()}${unit}`;
}

async function loadFont(text: string, weight: 400 | 800): Promise<ArrayBuffer | null> {
    try {
        const css = await (
            await fetch(
                `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`,
            )
        ).text();
        const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
        if (!url) return null;
        return await (await fetch(url)).arrayBuffer();
    } catch {
        return null;
    }
}

export default async function Image({ params }: { params: Promise<{ channelId: string }> }) {
    const { channelId } = await params;
    const data = await getChannel(channelId);

    const title = data?.channel.channel_title ?? "Viral Hunter";
    const category = data?.channel.main_category ?? "";

    // 큰 글씨 한 줄 — 지금 순위에 있으면 카테고리 순위, 아니면 등장 일수.
    const headline = !data
        ? "유튜브 급상승 채널 분석"
        : data.isCurrent && data.categoryRank > 0
          ? `${category} 구독자 ${data.categoryRank}위`
          : `급상승 순위 ${data.daysSeen}일 등장`;
    const headlineSub = data?.isCurrent && data.categoryRank > 0
        ? `추적 중인 ${category} 채널 ${data.categoryTotal.toLocaleString()}개 중`
        : data?.lastSeen ? `마지막 등장 ${data.lastSeen}` : "";

    const r = data?.recent;
    const stats: { label: string; value: string }[] = [];
    if (data) stats.push({ label: "구독자", value: fmtKr(data.channel.subscriber_count, "명") });
    if (r?.subs_from != null && r.subs_to != null && r.subs_to !== r.subs_from) {
        const d = r.subs_to - r.subs_from;
        stats.push({ label: "최근 30일 구독자", value: `${d > 0 ? "+" : "-"}${fmtKr(Math.abs(d), "명")}` });
    }
    if (data && data.channel.avg_daily_view_increase > 0) {
        stats.push({ label: "일평균 조회수", value: `+${fmtKr(data.channel.avg_daily_view_increase, "회")}` });
    } else if (r && r.videos.length > 0) {
        stats.push({ label: "최고 포착 영상", value: fmtKr(r.videos[0].v, "회") });
    }
    if (r && r.videos_30d > 0) stats.push({ label: "30일 포착 영상", value: `${r.videos_30d}개` });

    const footDate = data?.lastSeen ?? "";
    const age = daysSinceKst(footDate || null);
    const footer = `Viral Hunter 자체 집계 · YouTube 공개 데이터 기반${footDate ? ` · ${age === 0 ? "오늘" : footDate} 기준` : ""}`;

    const allText = [title, headline, headlineSub, footer, "trend.readthe1stars.com", "VIRAL HUNTER",
        ...stats.flatMap((s) => [s.label, s.value])].join("");
    const [bold, regular] = await Promise.all([loadFont(allText, 800), loadFont(allText, 400)]);
    const fonts = [
        ...(bold ? [{ name: "Noto Sans KR", data: bold, weight: 800 as const, style: "normal" as const }] : []),
        ...(regular ? [{ name: "Noto Sans KR", data: regular, weight: 400 as const, style: "normal" as const }] : []),
    ];

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%", height: "100%", display: "flex", flexDirection: "column",
                    justifyContent: "space-between", padding: "56px 64px",
                    background: "linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 45%, #F5F3FF 100%)",
                    fontFamily: "Noto Sans KR", color: "#1A1A1A",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 9, background: "#FF4500", display: "flex" }} />
                        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 4, color: "#FF4500" }}>VIRAL HUNTER</div>
                    </div>
                    {category ? (
                        <div style={{ display: "flex", fontSize: 24, fontWeight: 400, color: "#555", padding: "6px 18px", border: "2px solid #E5E5E5", borderRadius: 999 }}>
                            {category}
                        </div>
                    ) : <div style={{ display: "flex" }} />}
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", fontSize: title.length > 18 ? 52 : 64, fontWeight: 800, lineHeight: 1.15, maxWidth: 1070 }}>
                        {title.length > 34 ? `${title.slice(0, 33)}…` : title}
                    </div>
                    <div style={{ display: "flex", fontSize: 50, fontWeight: 800, color: "#FF4500", marginTop: 16 }}>📈 {headline}</div>
                    {headlineSub ? <div style={{ display: "flex", fontSize: 24, fontWeight: 400, color: "#777", marginTop: 6 }}>{headlineSub}</div> : null}
                </div>

                <div style={{ display: "flex", gap: 20 }}>
                    {stats.slice(0, 4).map((s) => (
                        <div key={s.label} style={{ display: "flex", flexDirection: "column", flex: 1, padding: "20px 24px", background: "#FFFFFF", border: "2px solid #EEEEEE", borderRadius: 24 }}>
                            <div style={{ display: "flex", fontSize: 22, fontWeight: 400, color: "#888" }}>{s.label}</div>
                            <div style={{ display: "flex", fontSize: 38, fontWeight: 800, marginTop: 6 }}>{s.value}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, fontWeight: 400, color: "#999" }}>
                    <div style={{ display: "flex" }}>{footer}</div>
                    <div style={{ display: "flex", fontWeight: 800, color: "#555" }}>trend.readthe1stars.com</div>
                </div>
            </div>
        ),
        { ...size, fonts, emoji: "twemoji" },
    );
}
