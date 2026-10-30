import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Database, Code2, Mail, BookOpen, Coffee } from "lucide-react";

/** 카카오페이 송금 QR 이미지. 원본이 1080x1306 이라 표시 크기도 같은 비율로 맞춘다. */
const KAKAOPAY_QR_PATH = "/kakaopay-qr.jpg";
const KAKAOPAY_QR_FILE = "kakaopay-qr.jpg";
/** 카카오페이 송금 링크 — 오너가 직접 제공한 주소 */
const KAKAOPAY_URL = "https://qr.kakaopay.com/FDlI8YvfL";

export const metadata = {
    title: "소개",
    description: "한국 유튜브 영상의 시간당 조회수/좋아요/댓글 급상승을 실시간 추적하는 무료 데이터 분석 도구",
    alternates: { canonical: "/about" },
    openGraph: {
        title: "소개 | Viral Hunter",
        description: "한국 유튜브 영상의 시간당 조회수/좋아요/댓글 급상승을 실시간 추적하는 무료 데이터 분석 도구",
        url: "/about",
        type: "website",
    },
};

export default function AboutPage() {
    // QR 이미지는 저장소에 없을 수 있다. 없는 상태로 <Image> 를 그리면 깨진 이미지가
    // 노출되므로, 빌드 시점에 존재 여부를 확인해 있을 때만 렌더한다.
    const hasQr = fs.existsSync(path.join(process.cwd(), "public", KAKAOPAY_QR_FILE));

    return (
        /* [2026-10-30] 새 디자인: 모양만 바꿨다. 글·링크는 그대로다. */
        <main className="vh-main vh-article vh-about">

            {/* ── Hero ────────────────────────────────────────── */}
            <section className="vh-phead">
                <p className="vh-eyebrow">About · Viral Hunter</p>
                <h1>🔥 Viral Hunter란?</h1>
                <p className="vh-lead">
                    한국 유튜브 영상의 <strong>시간당 조회수/좋아요/댓글 급상승</strong>을
                    실시간 추적하는 <strong>무료 데이터 분석 도구</strong>입니다.
                    구독자 수에 가려진, 진짜로 떡상하고 있는 영상을 매시간 발굴합니다.
                </p>
            </section>

            {/* ── 사용 방법 ─────────────────────────────────── */}
            <section className="vh-sec">
                <div className="vh-sec-title">
                    <h2>🎯 이렇게 사용하세요</h2>
                    <p className="vh-sec-note">
                        Viral Hunter는 이런 분들께 가장 유용합니다.
                    </p>
                </div>

                <div className="vh-about-uses">
                    {[
                        {
                            num: "01",
                            title: "마이크로 채널 떡상 영상 발견",
                            desc: "구독자 1만 이하의 채널에서 알고리즘을 탄 영상을 찾아 기획을 분석하세요.",
                            tag: "구독자 필터 → 마이크로",
                        },
                        {
                            num: "02",
                            title: "본인 분야 트렌드 파악",
                            desc: "내 카테고리에서 지금 이 순간 가장 빠르게 오르는 영상을 확인하세요.",
                            tag: "카테고리 필터",
                        },
                        {
                            num: "03",
                            title: "해외 트렌드 미리 보기",
                            desc: "국내에 상륙하기 전, 해외에서 먼저 터지고 있는 콘텐츠 흐름을 캐치하세요.",
                            tag: "지역 필터 → 해외",
                        },
                    ].map((item) => (
                        <div key={item.num} className="vh-card vh-about-use">
                            <span className="vh-about-num">{item.num}</span>
                            <h3>{item.title}</h3>
                            <p>{item.desc}</p>
                            <span className="vh-about-tag">{item.tag}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── 데이터 정보 ────────────────────────────────── */}
            <section className="vh-sec">
                <div className="vh-sec-title">
                    <h2>📊 데이터 정보</h2>
                    <p className="vh-sec-note">
                        매시간 자동으로 갱신되는 신뢰할 수 있는 데이터.
                    </p>
                </div>

                <div className="vh-kpis">
                    {[
                        { label: "추적 영상", value: "8만+", sub: "최근 48시간" },
                        { label: "추적 채널", value: "8천+", sub: "성장 채널 선별" },
                        { label: "업데이트", value: "매시간", sub: "자동 갱신" },
                        { label: "데이터 출처", value: "YouTube", sub: "Data API v3" },
                    ].map((stat) => (
                        <div key={stat.label} className="vh-kpi">
                            <small>{stat.label}</small>
                            <strong>{stat.value}</strong>
                            <span>{stat.sub}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── 기술 스택 ────────────────────────────────── */}
            <section className="vh-sec">
                <div className="vh-sec-title">
                    <h2>⚙️ 기술 스택</h2>
                    <p className="vh-sec-note">
                        견고하게 설계된 데이터 파이프라인.
                    </p>
                </div>

                <div className="vh-about-tech">
                    {[
                        { icon: <Database aria-hidden="true" />, role: "데이터", stack: "YouTube Data API · Google BigQuery" },
                        { icon: <Code2 aria-hidden="true" />, role: "백엔드", stack: "Python · Cloud Run" },
                        { icon: <Code2 aria-hidden="true" />, role: "프론트엔드", stack: "Next.js 16 · Vercel" },
                        { icon: <Database aria-hidden="true" />, role: "자동화", stack: "Stored Procedure · Cron" },
                    ].map((tech) => (
                        <div key={tech.role} className="vh-card vh-about-techitem">
                            <div className="vh-about-ic">{tech.icon}</div>
                            <div>
                                <p className="vh-about-role">{tech.role}</p>
                                <p className="vh-about-stack">{tech.stack}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── 만든 사람 / 연락처 ───────────────────────── */}
            <section className="vh-sec">
                <div className="vh-sec-title">
                    <h2>📧 만든 사람</h2>
                    <p className="vh-sec-note">
                        피드백과 제안은 언제든 환영합니다.
                    </p>
                </div>

                <div className="vh-card vh-about-maker">
                    <div className="vh-about-story">
                        <p>안녕하세요. 현직 데이터 엔지니어입니다.</p>
                        <p>
                            크리에이터들이 &ldquo;지금 뜨는 영상&rdquo;을 매번 손으로 찾는 게
                            번거로워 보여서 만들기 시작했습니다.
                        </p>
                        {/* 아래 문단은 실제 파이프라인 수치(추적 채널 8,000개, 지표 기록 5억 건 이상,
                            집 노트북에서 매시간 실행)를 근거로 쓴 초안입니다.
                            본인 경험에 맞게 자유롭게 고쳐 쓰세요. */}
                        <p>
                            수집 주기를 매시간으로 잡은 건, 하루 단위로 보면 이미 뜨고 난 뒤에야
                            알게 되기 때문입니다. 지금은 채널 8,000개를 추적하고 있고 영상 지표
                            기록은 5억 건을 넘었습니다. 거창한 서버가 아니라 집에 있는 노트북
                            한 대가 이 일을 계속하고 있습니다.
                        </p>
                        <p>
                            평소 안 다루던 프론트엔드는 AI(Claude, Cursor) 도움을 많이 받았습니다.
                            <strong> 2026년 5월부터 매시간 자동</strong>으로 돌아가고 있습니다.
                        </p>
                        <p>광고 없이 계속 무료로 운영할 생각입니다.</p>
                    </div>

                    <div className="vh-about-btns">
                        <a href="mailto:cjswoaos777@gmail.com" className="vh-cta">
                            <Mail aria-hidden="true" />
                            cjswoaos777@gmail.com
                        </a>
                        <a
                            href="https://datahunter777.tistory.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vh-btn-line"
                        >
                            <BookOpen aria-hidden="true" />
                            블로그 방문하기
                            <ArrowRight aria-hidden="true" />
                        </a>
                    </div>
                </div>
            </section>

            {/* ── 후원하기 ─────────────────────────────────── */}
            {/* 머리 메뉴·바닥글·리포트 끝의 '후원하기'가 여기(#support)로 온다. 결제 수단(QR·링크)은 이 페이지에만 둔다. */}
            <section id="support" className="vh-sec vh-about-support">
                <div className="vh-sec-title">
                    <h2>☕ 후원하기</h2>
                    <p className="vh-sec-note">
                        서버 비용에 보탬이 됩니다.
                    </p>
                </div>

                <div className="vh-card vh-about-give">
                    <p className="vh-about-givetext">
                        매달 서버 비용이 조금씩 나갑니다. 도움이 되셨다면 커피 한 잔으로
                        응원해주세요.
                    </p>

                    <div className="vh-about-pay">
                        <a
                            href={KAKAOPAY_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vh-about-kakao"
                        >
                            <Coffee aria-hidden="true" />
                            카카오페이로 응원하기
                        </a>

                        {/* 데스크톱에서는 링크를 눌러도 앱이 열리지 않으므로 QR 을 함께 둔다. */}
                        {hasQr && (
                            <div className="vh-about-qr">
                                <Image
                                    src={KAKAOPAY_QR_PATH}
                                    alt="카카오페이 송금 QR 코드"
                                    width={132}
                                    height={160}
                                    unoptimized
                                />
                                <p>
                                    PC에서는 휴대폰 카메라로
                                    <br />
                                    QR을 찍어주세요.
                                </p>
                            </div>
                        )}
                    </div>

                    <p className="vh-about-free">
                        ※ 후원 여부와 관계없이 모든 기능은 무료입니다.
                    </p>
                </div>
            </section>

            {/* ── CTA ───────────────────────────────────────── */}
            <section className="vh-center">
                <Link href="/dashboard" className="vh-cta">
                    실시간 랭킹 보러가기
                    <ArrowRight aria-hidden="true" />
                </Link>
            </section>

        </main>
    );
}
