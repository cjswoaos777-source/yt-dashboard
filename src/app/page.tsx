import Link from "next/link";
import { ArrowRight } from "lucide-react";

/*
 * 홈 (2026-10-30 새 디자인, '모양만' 배포용)
 *
 * 글·순서·링크는 main(지금 사이트)의 홈과 똑같이 두고 모양만 바꿨다.
 * 홈은 10-29 에 '볼 수 있는 것'·'데이터는 이렇게 모읍니다'를 더한 효과를 11-26 에 판정한다
 * (seo.change_log 0f77e53ee8). 그 전에 글이 늘면 판정이 섞이므로, 시안의 새 칸(실시간 1~5위·숫자 카드·
 * 해외 5개·카테고리 온도)은 11-26 판정 뒤에 붙인다. 그 코드는 브랜치 커밋 6431b1d 의 src/app/page.tsx 에 있다.
 * 예전에 쓰던 GSAP 등장 효과는 뺐다(글은 같음).
 *
 * [2026-10-31] 파이프라인 1단계(채널 등급 추적 끔·채널 7일 롤링 매일·영상 7일 기록·매시간 최근 3시간 수집)에
 * 맞춰 틀린 사실만 고쳤다: 영상 수(80,000 → 15만, 0티어 추적 대상 실측 15.3~15.5만), '2일 이내만 추적',
 * 수집 범위(매시간 수집), 갱신 주기(채널 8,000 → 7일 롤링 31만). 순위 대상이 7일로 바뀌는 문구는 2단계에.
 * 같은 날 다시 고침: 15만은 수집이 유난히 많았던 10-30 하루 값이었다. 0티어 = 그날 17시 수집에서 처음 찾은 영상
 * + 24시간 안 매시간 수집이고, 17시 수집이 날마다 9.3만~14.4만(10-25~30)이라 0티어는 대략 10만~16만을 오간다.
 * 그래서 '10만+'(10만 개가 넘는)로 둔다.
 */
export default function LandingPage() {
    return (
        <main className="vh-main vh-home">

            {/* ── Hero ───────────────────────────────────────── */}
            <section className="vh-hero vh-hero-solo">
                <div className="vh-hero-copy">
                    {/* Badge */}
                    <p className="vh-live">
                        <span className="vh-live-dot" />
                        매시간 업데이트 · 실시간 트렌드 분석
                    </p>

                    {/* H1 */}
                    <h1>
                        트렌드는 느낌이 아니라<br />
                        <span className="vh-hero-em">데이터입니다</span>
                    </h1>

                    {/* Sub copy */}
                    <p className="vh-lead">
                        최근 48시간 동안 수집된 10만 개가 넘는 영상 중<br />
                        지금 이 순간 가장 빠르게 오르고 있는 영상과<br />
                        7일간 눈에 띄게 성장한 채널을 찾아드립니다.
                    </p>

                    {/* CTA */}
                    <Link href="/dashboard" className="vh-cta">
                        실시간 트렌드 보러가기
                        <ArrowRight aria-hidden="true" />
                    </Link>
                </div>
            </section>

            {/* ── Numbers / Data ─────────────────────────────── */}
            <section className="vh-sec">
                <h2 className="vh-h2-lg">
                    매 순간 쌓이는 데이터가<br />트렌드를 만듭니다
                </h2>

                <div className="vh-stats">
                    {[
                        {
                            number: "10만+",
                            label: "최근 48시간 수집된 영상",
                            sub: "매시간 다시 재서 순위에 반영",
                        },
                        {
                            number: "30만+",
                            label: "채널 데이터베이스",
                            sub: "최근 7일 수집 채널 전부 매일 갱신",
                        },
                        {
                            number: "매시간",
                            label: "데이터 갱신 주기",
                            sub: "1시간마다 최신 트렌드 반영",
                        },
                    ].map((card) => (
                        <div key={card.label} className="vh-stat">
                            <strong>
                                {card.number}
                            </strong>
                            <b>
                                {card.label}
                            </b>
                            <span>
                                {card.sub}
                            </span>
                        </div>
                    ))}
                </div>

                <p className="vh-lead">
                    10만 개가 넘는 영상 중 지금 이 순간<br className="hidden sm:block" />
                    가장 빠르게 오르고 있는 영상을 찾아드립니다
                </p>
            </section>

            {/* ── Problem & Solution ─────────────────────────── */}
            {/* Problem */}
            <section className="vh-sec">
                <h2 className="vh-h2-lg">
                    유튜브 시작, 막막하신가요?
                </h2>
                <p className="vh-lead">
                    많은 분들이 비슷한 벽에 부딪힙니다.
                </p>

                <div className="vh-problems">
                    {[
                        {
                            title: "방송국 영상만 가득한\n인기동영상",
                            desc: "유튜브 인기 탭을 열면 대형 방송사, 연예인 채널이 독식합니다. 일반인이 참고할 만한 영상이 없어요.",
                        },
                        {
                            title: "내 채널과 안 맞는\n트렌드",
                            desc: "수백만 구독자 채널의 성공 방식은 막 시작한 채널에 그대로 적용하기 어렵습니다.",
                        },
                        {
                            title: "무엇을 찍을지 모르는\n막막함",
                            desc: "아이디어는 없고 시간은 흘러갑니다. 오늘도 빈 기획안 파일만 열어두고 닫았나요?",
                        },
                    ].map((card) => (
                        <div key={card.title} className="vh-problem">
                            <h3>
                                {card.title}
                            </h3>
                            <p>
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Solution */}
            <section className="vh-sec">
                <h2 className="vh-h2-lg">
                    하꼬의 반란!<br />
                    <span className="vh-hero-em">진짜 떡상하는 영상</span>을 찾아냅니다
                </h2>
                <p className="vh-lead">
                    저희만의 핵심 알고리즘이 숨겨진 바이럴 영상을 발굴합니다.
                </p>

                {/* Formula card */}
                <div className="vh-formula">
                    <p className="vh-formula-label">
                        떡상 잠재력 지수
                    </p>
                    <div className="vh-formula-row">
                        <span>
                            <b>조회수</b>
                            <small>Views</small>
                        </span>
                        <i>÷</i>
                        <span>
                            <b>구독자 수</b>
                            <small>Subscribers</small>
                        </span>
                        <i>×</i>
                        <span>
                            <b>100</b>
                            <small>Multiplier</small>
                        </span>
                        <i>=</i>
                        <span>
                            <b className="vh-formula-out">Viral Score</b>
                            <small>떡상 잠재력 지수</small>
                        </span>
                    </div>
                    <p>
                        구독자 수 대비 조회수가 폭발적으로 높은 영상 = 알고리즘이 밀어주는 영상.<br />
                        이 공식으로 <strong>구독자가 적어도 터진 영상</strong>을 정확히 찾아냅니다.
                    </p>
                    <Link href="/dashboard" className="vh-cta">
                        바이럴 영상 지금 확인하기
                        <ArrowRight aria-hidden="true" />
                    </Link>
                </div>
            </section>

            {/* ── 둘러보기 + 데이터 출처 ─────────────────────────────
                [2026-10-29] SEO 운영안: 홈에 '무엇을, 어떤 데이터로, 얼마나 자주, 누가'를 적는다.
                구글이 홈까지 '크롤링됨-색인 안 됨'으로 둔 상태라, 홍보 문구 대신 사이트의 실제 쓰임과
                데이터 출처를 보이는 글로 둔다. 숫자는 수집기 정의(utube_rank/agents/collector.py)와 맞춘다. */}
            <section className="vh-sec">
                <h2 className="vh-h2-lg">
                    Viral Hunter에서 볼 수 있는 것
                </h2>
                <p className="vh-lead">
                    한국 유튜브에서 지금 뜨는 영상과 채널을 일곱 가지 방법으로 봅니다.
                </p>
                <div className="vh-links">
                    {[
                        { href: "/dashboard", title: "실시간 급상승 순위", desc: "업로드 2일 안 된 영상을 시간당 조회수 증가로 줄 세운 TOP 1,000. 숏츠·롱폼, 카테고리, 구독자 구간별로 고를 수 있습니다." },
                        { href: "/category", title: "카테고리별 급상승 유튜버", desc: "게임, 예능, 교육 등 11개 카테고리마다 이번 주 가장 빠르게 크는 채널을 모았습니다." },
                        { href: "/dashboard/benchmarking", title: "성장 채널 분석", desc: "구독자 대비 조회수가 잘 나오는 채널을 체급별로 비교합니다. 개설 90일 안 된 신규 채널도 따로 볼 수 있습니다." },
                        { href: "/ideas", title: "지금 만들 만한 영상", desc: "지금 반응을 보고 만들어 볼 만한 주제와 형식을 매시간 골라 드립니다. 메일로도 받을 수 있어요." },
                        { href: "/report", title: "주간 트렌드 리포트", desc: "매주 월요일, 지난 한 주 무엇이 떴는지 숫자와 해석으로 정리합니다." },
                        { href: "/insights", title: "데이터 인사이트", desc: "업로드 시간대, 숏츠와 롱폼, 채널 나이에 따라 성과가 어떻게 다른지 수집 데이터로 확인했습니다." },
                        { href: "/about/metrics", title: "지표 설명", desc: "시간당 증가량, 성장 지수, 구독자 구간을 어떻게 계산하는지 공개합니다." },
                    ].map((item) => (
                        <Link key={item.href} href={item.href}>
                            <h3>
                                {item.title}
                                <ArrowRight aria-hidden="true" />
                            </h3>
                            <p>{item.desc}</p>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="vh-sec vh-datafacts">
                <h2 className="vh-h2-lg">
                    데이터는 이렇게 모읍니다
                </h2>
                <ul>
                    <li>
                        <strong>출처</strong>: YouTube Data API로 받은 공개 데이터(조회수, 좋아요, 댓글, 구독자 수)입니다. 로그인이 필요한 데이터나
                        채널 주인만 보는 통계는 쓰지 않습니다.
                    </li>
                    <li>
                        <strong>수집 범위</strong>: 매일 오후 5시에 15개 카테고리에서 한국 지역 검색 기준으로 업로드 2일 안 된 영상을 찾고,
                        4분 미만 영상은 조회수 3만 회, 4분 이상은 1만 회를 넘은 것만 모읍니다. 매시간 최근 3시간 안에 올라온 영상도
                        같은 기준으로 더 찾습니다. 한국 유튜브 전체가 아니라 이미 반응이 오기 시작한 영상의 표본입니다.
                    </li>
                    <li>
                        <strong>갱신 주기</strong>: 영상 조회수는 매시간 다시 재서 순위를 갱신합니다. 찾은 영상은 올라온 지 7일이 될 때까지 계속 기록하고,
                        최근 7일 안에 수집에 걸린 채널 30만여 곳의 구독자·조회수는 매일 오후 5시 수집 뒤 한 번 받습니다.
                    </li>
                    <li>
                        <strong>보관 기간</strong>: YouTube API 정책에 따라 영상·채널 수치는 30일이 지나면 지우거나 다시 받습니다. 그래서 오래전 기록은 남기지 않습니다.
                    </li>
                    <li>
                        <strong>운영</strong>: 현직 데이터 엔지니어 한 명이 개인적으로 만들고 운영합니다. 유튜브(Google)와 관계가 없는 독립 사이트입니다.
                    </li>
                </ul>
                <p>
                    계산 방식은 <Link href="/about/metrics">지표 설명</Link>에서,
                    운영자와 만든 이유는 <Link href="/about">소개</Link>에서 볼 수 있습니다.
                </p>
            </section>

            {/* ── 운영자 안내 ─────────────────────────────────────── */}
            <section>
                <p className="vh-maker">
                    이 사이트는 현직 데이터 엔지니어가 취미로 만들어 운영 중입니다.{" "}
                    <Link href="/about">
                        자세히 보기 →
                    </Link>
                </p>
            </section>
        </main>
    );
}
