import Link from "next/link";
import { unstable_cache } from "next/cache";
import { fetchRanking, fetchRankingVersion, type RankingRow } from "@/lib/supabase";
import { isSupabase } from "@/lib/datasource";
import { CATEGORY_META, CATEGORY_SLUGS } from "@/lib/categories";
import { BigCard, Kr, RankRowStatic, categoryKo } from "@/components/site/rank";

/*
 * [2026-10-30 새 디자인] 홈.
 * - 첫 화면에 '지금 뜨는 영상' 1~5위를 바로 보여 준다('매시간 갱신'이 사이트의 정체성).
 * - 글(제목·문단·'볼 수 있는 것'·'데이터는 이렇게 모읍니다')은 그대로 둔다. 홈 SEO 변경(0f77e53ee8)의
 *   판정이 11-26 이라 본문 글을 바꾸지 않고 모양만 바꾼다. 숫자 문구는 2단계(7일 추적) 기준이다.
 * - 예전의 GSAP 진입 애니메이션(처음에 글을 숨겼다가 나타냄)은 뺐다. 첫 화면이 바로 보여야 한다.
 */

const SLUG_BY_CATEGORY = Object.fromEntries(CATEGORY_SLUGS.map((s) => [CATEGORY_META[s].category, s])) as Record<string, string>;

const getHomeLive = (version: string) =>
    unstable_cache(
        async (): Promise<{ dom: RankingRow[]; ovs: RankingRow[] }> => {
            const [dom, ovs] = await Promise.all([
                fetchRanking({ tier: "all", origin: "DOMESTIC", limit: 150 }),
                fetchRanking({ tier: "all", origin: "IMPORTED", limit: 5 }),
            ]);
            return { dom, ovs };
        },
        // 데이터 버전(매시 25분에 바뀜)을 키에 넣어, 바뀐 직후 첫 요청부터 새 순위를 보여 준다.
        ["home-live-v1", version],
        { revalidate: 3600 },
    )();

async function loadLive(): Promise<{ dom: RankingRow[]; ovs: RankingRow[] }> {
    if (!isSupabase) return { dom: [], ovs: [] };
    try {
        return await getHomeLive((await fetchRankingVersion()).version);
    } catch {
        return { dom: [], ovs: [] };
    }
}

function hourOf(updatedAt: string | undefined): number | null {
    const m = updatedAt?.match(/-(\d{1,2})$/);
    return m ? Number(m[1]) : null;
}

export default async function LandingPage() {
    const { dom, ovs } = await loadLive();
    const hour = hourOf(dom[0]?.updated_at);
    const top100 = dom.slice(0, 100);
    const shortsPct = top100.length ? Math.round((top100.filter((r) => r.video_type?.startsWith("Shorts")).length / top100.length) * 100) : null;
    const top100Sum = top100.reduce((s, r) => s + (r.hourly_view_increase ?? 0), 0);
    const cats = Object.entries(
        dom.reduce<Record<string, number>>((acc, r) => {
            if (r.category_name) acc[r.category_name] = (acc[r.category_name] ?? 0) + 1;
            return acc;
        }, {}),
    )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
    const catMax = Math.max(1, ...cats.map(([, n]) => n));

    return (
        <main className="vh-main vh-home">
            {/* ── 첫 화면: 제목 + 지금 뜨는 영상 ─────────────────────────────── */}
            <section className="vh-hero">
                <div className="vh-hero-copy">
                    <p className="vh-eyebrow">
                        <span className="vh-live-dot" aria-hidden="true" />
                        {hour !== null ? `${hour}시 집계 · ` : ""}매시간 업데이트 · 실시간 트렌드 분석
                    </p>
                    <h1>
                        트렌드는 느낌이 아니라
                        <br />
                        <span className="vh-hero-em">데이터입니다</span>
                    </h1>
                    <p className="vh-lead">
                        올라온 지 7일 안 된 영상 50만여 개를 매시간 다시 재서
                        <br className="vh-br-wide" /> 지금 이 순간 가장 빠르게 오르고 있는 영상과
                        <br className="vh-br-wide" /> 최근 7일 동안 눈에 띄게 성장한 채널을 찾아드립니다.
                    </p>
                    <Link href="/dashboard" className="vh-cta">
                        실시간 트렌드 보러가기 <span aria-hidden="true">→</span>
                    </Link>
                </div>

                {dom.length > 0 && (
                    <div className="vh-hero-live" aria-label="지금 뜨는 영상 1~5위">
                        <BigCard r={dom[0]} />
                        <ol className="vh-list vh-list-tight" start={2}>
                            {dom.slice(1, 5).map((r, i) => (
                                <RankRowStatic key={r.video_id} r={r} rank={i + 2} />
                            ))}
                        </ol>
                        <Link href="/dashboard" className="vh-more">
                            1,000위까지 보기 <span aria-hidden="true">→</span>
                        </Link>
                    </div>
                )}
            </section>

            {/* ── 지금 순위 요약 ─────────────────────────────── */}
            {dom.length > 0 && (
                <section className="vh-kpis" aria-label="지금 순위 요약">
                    <div className="vh-kpi">
                        <small>국내 1위 · 최근 1시간</small>
                        <strong>
                            <Kr n={dom[0].hourly_view_increase} prefix="+" />
                        </strong>
                        <span>{dom[0].channel_title}</span>
                    </div>
                    <div className="vh-kpi">
                        <small>국내 상위 100개 · 최근 1시간</small>
                        <strong>
                            <Kr n={top100Sum} prefix="+" />
                        </strong>
                        <span>100개 영상이 한 시간에 얻은 조회수</span>
                    </div>
                    <div className="vh-kpi">
                        <small>쇼츠 비율</small>
                        <strong>{shortsPct ?? "–"}%</strong>
                        <span>국내 상위 100위 기준</span>
                    </div>
                    <div className="vh-kpi">
                        <small>가장 많이 뜬 분야</small>
                        <strong>{cats[0] ? categoryKo(cats[0][0]) : "–"}</strong>
                        <span>{cats[0] ? `국내 상위 150위 중 ${cats[0][1]}개` : ""}</span>
                    </div>
                </section>
            )}

            {(ovs.length > 0 || cats.length > 0) && (
                <div className="vh-two">
                    {ovs.length > 0 && (
                        <section className="vh-sec" aria-labelledby="ovs-title">
                            <div className="vh-sec-head">
                                <h2 id="ovs-title">해외에서 뜨는 영상</h2>
                                <Link href="/dashboard?region=%ED%95%B4%EC%99%B8">더 보기</Link>
                            </div>
                            <ol className="vh-list vh-list-tight">
                                {ovs.map((r, i) => (
                                    <RankRowStatic key={r.video_id} r={r} rank={i + 1} />
                                ))}
                            </ol>
                        </section>
                    )}
                    {cats.length > 0 && (
                        <section className="vh-sec" aria-labelledby="cat-title">
                            <div className="vh-sec-head">
                                <h2 id="cat-title">카테고리 온도</h2>
                                <span className="vh-sec-note">국내 상위 150위 중 몇 개인지</span>
                            </div>
                            <ul className="vh-cats">
                                {cats.map(([name, n]) => {
                                    const slug = SLUG_BY_CATEGORY[name];
                                    const href = slug ? `/category/${slug}` : `/dashboard?category=${encodeURIComponent(name)}`;
                                    return (
                                        <li key={name}>
                                            <Link href={href}>
                                                <span className="vh-cat-name">{categoryKo(name)}</span>
                                                <span className="vh-cat-bar">
                                                    <span style={{ width: `${(n / catMax) * 100}%` }} />
                                                </span>
                                                <span className="vh-cat-n">{n}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}
                </div>
            )}

            {/* ── 숫자 ─────────────────────────────── */}
            <section className="vh-sec" aria-labelledby="numbers-title">
                <h2 id="numbers-title" className="vh-h2-lg">
                    매 순간 쌓이는 데이터가 트렌드를 만듭니다
                </h2>
                <div className="vh-stats">
                    {[
                        { number: "50만+", label: "매시간 다시 재는 영상", sub: "올라온 지 7일이 될 때까지 따라갑니다" },
                        { number: "8,000+", label: "성장 채널 데이터베이스", sub: "최근 7일 눈에 띄는 채널만 선별" },
                        { number: "매시간", label: "데이터 갱신 주기", sub: "1시간마다 최신 트렌드 반영" },
                    ].map((card) => (
                        <div key={card.label} className="vh-stat">
                            <strong>{card.number}</strong>
                            <b>{card.label}</b>
                            <span>{card.sub}</span>
                        </div>
                    ))}
                </div>
                <p className="vh-lead">50만여 개 영상 중 지금 이 순간 가장 빠르게 오르고 있는 영상을 찾아드립니다</p>
            </section>

            {/* ── 문제와 해결 ─────────────────────────────── */}
            <section className="vh-sec" aria-labelledby="problem-title">
                <h2 id="problem-title" className="vh-h2-lg">유튜브 시작, 막막하신가요?</h2>
                <p className="vh-lead">많은 분들이 비슷한 벽에 부딪힙니다.</p>
                <div className="vh-problems">
                    {[
                        {
                            title: "방송국 영상만 가득한 인기동영상",
                            desc: "유튜브 인기 탭을 열면 대형 방송사, 연예인 채널이 독식합니다. 일반인이 참고할 만한 영상이 없어요.",
                        },
                        {
                            title: "내 채널과 안 맞는 트렌드",
                            desc: "수백만 구독자 채널의 성공 방식은 막 시작한 채널에 그대로 적용하기 어렵습니다.",
                        },
                        {
                            title: "무엇을 찍을지 모르는 막막함",
                            desc: "아이디어는 없고 시간은 흘러갑니다. 오늘도 빈 기획안 파일만 열어두고 닫았나요?",
                        },
                    ].map((card) => (
                        <div key={card.title} className="vh-problem">
                            <h3>{card.title}</h3>
                            <p>{card.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="vh-sec" aria-labelledby="solution-title">
                <h2 id="solution-title" className="vh-h2-lg">
                    하꼬의 반란! <span className="vh-hero-em">진짜 떡상하는 영상</span>을 찾아냅니다
                </h2>
                <p className="vh-lead">저희만의 핵심 알고리즘이 숨겨진 바이럴 영상을 발굴합니다.</p>
                <div className="vh-formula">
                    <p className="vh-formula-label">떡상 잠재력 지수</p>
                    <div className="vh-formula-row">
                        <span>
                            <b>조회수</b>
                            <small>Views</small>
                        </span>
                        <i aria-hidden="true">÷</i>
                        <span>
                            <b>구독자 수</b>
                            <small>Subscribers</small>
                        </span>
                        <i aria-hidden="true">×</i>
                        <span>
                            <b>100</b>
                            <small>Multiplier</small>
                        </span>
                        <i aria-hidden="true">=</i>
                        <span>
                            <b className="vh-formula-out">Viral Score</b>
                            <small>떡상 잠재력 지수</small>
                        </span>
                    </div>
                    <p>
                        구독자 수 대비 조회수가 폭발적으로 높은 영상 = 알고리즘이 밀어주는 영상.
                        <br />
                        이 공식으로 <strong>구독자가 적어도 터진 영상</strong>을 정확히 찾아냅니다.
                    </p>
                    <Link href="/dashboard" className="vh-cta">
                        바이럴 영상 지금 확인하기 <span aria-hidden="true">→</span>
                    </Link>
                </div>
            </section>

            {/* ── 둘러보기 + 데이터 출처 ─────────────────────────────
                [2026-10-29] SEO 운영안: 홈에 '무엇을, 어떤 데이터로, 얼마나 자주, 누가'를 적는다.
                홍보 문구 대신 사이트의 실제 쓰임과 데이터 출처를 보이는 글로 둔다. 숫자는 수집기 정의와 맞춘다. */}
            <section className="vh-sec" aria-labelledby="see-title">
                <h2 id="see-title" className="vh-h2-lg">Viral Hunter에서 볼 수 있는 것</h2>
                <p className="vh-lead">한국 유튜브에서 지금 뜨는 영상과 채널을 일곱 가지 방법으로 봅니다.</p>
                <div className="vh-links">
                    {[
                        { href: "/dashboard", title: "실시간 급상승 순위", desc: "올라온 지 7일 안 된 영상을 최근 1시간 조회수로 줄 세운 TOP 1,000. 숏츠·롱폼, 카테고리, 구독자 구간별로 고를 수 있습니다." },
                        { href: "/category", title: "카테고리별 급상승 유튜버", desc: "게임, 예능, 교육 등 11개 카테고리마다 이번 주 가장 빠르게 크는 채널을 모았습니다." },
                        { href: "/dashboard/benchmarking", title: "성장 채널 분석", desc: "구독자 대비 조회수가 잘 나오는 채널을 체급별로 비교합니다. 개설 90일 안 된 신규 채널도 따로 볼 수 있습니다." },
                        { href: "/ideas", title: "지금 만들 만한 영상", desc: "지금 반응을 보고 만들어 볼 만한 주제와 형식을 매시간 골라 드립니다. 메일로도 받을 수 있어요." },
                        { href: "/report", title: "주간 트렌드 리포트", desc: "매주 월요일, 지난 한 주 무엇이 떴는지 숫자와 해석으로 정리합니다." },
                        { href: "/insights", title: "데이터 인사이트", desc: "업로드 시간대, 숏츠와 롱폼, 채널 나이에 따라 성과가 어떻게 다른지 수집 데이터로 확인했습니다." },
                        { href: "/about/metrics", title: "지표 설명", desc: "시간당 증가량, 성장 지수, 구독자 구간을 어떻게 계산하는지 공개합니다." },
                    ].map((item) => (
                        <Link key={item.href} href={item.href}>
                            <h3>
                                {item.title} <span aria-hidden="true">→</span>
                            </h3>
                            <p>{item.desc}</p>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="vh-sec vh-datafacts" aria-labelledby="data-title">
                <h2 id="data-title" className="vh-h2-lg">데이터는 이렇게 모읍니다</h2>
                <ul>
                    <li>
                        <strong>출처</strong>: YouTube Data API로 받은 공개 데이터(조회수, 좋아요, 댓글, 구독자 수)입니다. 로그인이 필요한 데이터나
                        채널 주인만 보는 통계는 쓰지 않습니다.
                    </li>
                    <li>
                        <strong>수집 범위</strong>: 매일 오후 5시에 15개 카테고리에서 한국 지역 검색 기준으로 업로드 2일 안 된 영상을 찾고, 4분 미만
                        영상은 조회수 3만 회, 4분 이상은 1만 회를 넘은 것만 모읍니다. 매시간 최근 3시간 안에 올라온 영상도 같은 기준으로 더 찾습니다.
                        한국 유튜브 전체가 아니라 이미 반응이 오기 시작한 영상의 표본입니다.
                    </li>
                    <li>
                        <strong>갱신 주기</strong>: 찾은 영상은 올라온 지 7일이 될 때까지 따라갑니다. 국내 영상은 매시간, 해외 영상은 잘 오르는 12만
                        개만 매시간 다시 재고 나머지는 6시간마다 잽니다. 최근 7일 안에 수집에 걸린 채널의 구독자·조회수는 매일 오후 5시 수집 뒤 한 번
                        받습니다.
                    </li>
                    <li>
                        <strong>보관 기간</strong>: YouTube API 정책에 따라 영상·채널 수치는 30일이 지나면 지우거나 다시 받습니다. 그래서 오래전 기록은
                        남기지 않습니다.
                    </li>
                    <li>
                        <strong>운영</strong>: 현직 데이터 엔지니어 한 명이 개인적으로 만들고 운영합니다. 유튜브(Google)와 관계가 없는 독립 사이트입니다.
                    </li>
                </ul>
                <p>
                    계산 방식은 <Link href="/about/metrics">지표 설명</Link>에서, 운영자와 만든 이유는 <Link href="/about">소개</Link>에서 볼 수
                    있습니다.
                </p>
            </section>

            {/* ── 운영자 안내 ─────────────────────────────────────── */}
            <p className="vh-maker">
                이 사이트는 현직 데이터 엔지니어가 취미로 만들어 운영 중입니다. <Link href="/about">자세히 보기 →</Link>
            </p>
        </main>
    );
}
