import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = SITE.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding: "80px",
                    background: "linear-gradient(135deg, #1A1A1A 0%, #000000 100%)",
                    fontFamily: "sans-serif",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        marginBottom: "32px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "64px",
                            height: "64px",
                            borderRadius: "16px",
                            background: "#FF4500",
                            fontSize: "36px",
                        }}
                    >
                        🔥
                    </div>
                    <div
                        style={{
                            fontSize: "32px",
                            fontWeight: 700,
                            color: "#FFFFFF",
                            letterSpacing: "-0.02em",
                        }}
                    >
                        Viral Hunter
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        fontSize: "72px",
                        fontWeight: 800,
                        color: "#FFFFFF",
                        lineHeight: 1.1,
                        letterSpacing: "-0.03em",
                        marginBottom: "24px",
                    }}
                >
                    <span>유튜브 떡상 영상</span>
                    <span>실시간 랭킹</span>
                </div>

                <div
                    style={{
                        fontSize: "30px",
                        color: "#AAAAAA",
                        lineHeight: 1.4,
                        maxWidth: "900px",
                    }}
                >
                    구독자 수에 가려진, 지금 이 순간 가장 빠르게 터지고 있는 영상을 매시간 발굴합니다.
                </div>

                <div
                    style={{
                        display: "flex",
                        marginTop: "48px",
                        gap: "12px",
                    }}
                >
                    {["실시간 랭킹", "채널 벤치마킹", "매시간 갱신"].map((tag) => (
                        <div
                            key={tag}
                            style={{
                                display: "flex",
                                fontSize: "22px",
                                color: "#FFFFFF",
                                border: "1px solid #444444",
                                borderRadius: "9999px",
                                padding: "8px 24px",
                            }}
                        >
                            {tag}
                        </div>
                    ))}
                </div>
            </div>
        ),
        { ...size }
    );
}
