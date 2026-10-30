import Link from "next/link";
import type { Metadata } from "next";
import { MetricsDisclosure } from "@/components/legal";

/**
 * 지표 설명 페이지.
 *
 * [2026-10-24] 채널 페이지마다 똑같이 붙던 '각 지표는 무슨 뜻인가요?' 설명을 여기 한 곳으로 모은다
 * (SEO 실험 ch-unique-2026-10 실험군은 링크만 남김). 계산 방법을 한곳에 밝혀 두는 것은
 * '누가 어떤 근거로 만든 수치인가'를 보여 주는 신뢰 장치이기도 하다.
 */
export const metadata: Metadata = {
    title: "지표 설명 — 시간당 증가량·일평균·성장 지수·순위 계산 방법",
    description:
        "Viral Hunter가 보여 주는 유튜브 지표를 어떻게 계산하는지 설명합니다. 시간당 조회수 증가량, 일평균 증가, 성장 지수, 구독자 구간, 순위의 기준과 데이터 갱신 주기.",
    alternates: { canonical: "/about/metrics" },
};

const ITEMS: { term: string; body: React.ReactNode }[] = [
    {
        term: "시간당 증가량 (최근 1시간 조회수)",
        body: <>추적 중인 영상의 조회수·좋아요·댓글 수를 다시 받아, <strong>바로 전에 잰 값과의 차이를 1시간 기준으로</strong> 계산합니다. 영상은 올라온 지 7일이 될 때까지 따라가며, 국내 영상은 매시간, 해외 영상은 잘 오르는 12만 개만 매시간·나머지는 6시간마다 잽니다(6시간 차이는 1시간 평균으로 나눕니다). 실시간 급상승 순위는 이 값으로 줄을 세웁니다.</>,
    },
    {
        term: "일평균 증가",
        body: <>채널의 구독자·총조회수를 기록해 둔 날들 사이의 증가량을 <strong>실제 경과 일수</strong>로 나눈 값입니다. 최대 7일치를 봅니다. 측정이 한 번뿐인 채널은 비교할 값이 없어 아직 계산하지 않습니다.</>,
    },
    {
        term: "성장 지수",
        body: <><strong>최근 7일 평균 조회수 ÷ 구독자 수</strong>입니다. 구독자가 아주 적은 채널이 지나치게 높게 나오지 않도록 분모에 숏츠 채널은 3,000, 롱폼 채널은 1,000을 더합니다. 조회수 절대량이 아니라 <strong>구독자 대비 얼마나 잘 나오는지</strong>를 재는 값이라 구독자가 많을수록 낮게 나옵니다.</>,
    },
    {
        term: "구독자 구간",
        body: <>구독자 100만 명 이상, 10만~100만, 1만~10만, 1만 미만의 네 구간으로 나눕니다. 비슷한 규모끼리 비교하기 위해서입니다.</>,
    },
    {
        term: "순위",
        body: <>한국 유튜브 전체가 아니라, Viral Hunter가 <strong>추적 중인 채널·영상 안에서의 상대 위치</strong>입니다. 추적 대상은 매일 유튜브 검색으로 새로 올라온 영상을 모으며 넓혀 갑니다.</>,
    },
    {
        term: "채널 분석 문장",
        body: <>채널 페이지의 분석 문장은 같은 카테고리·비슷한 구독자 규모 채널과 비교해 자동으로 만듭니다. 조회수는 업로드 후 약 2일 동안 수집한 값입니다.</>,
    },
    {
        term: "갱신 주기",
        body: <>영상 순위는 매시간, 채널 지표와 채널 분석은 매일 저녁, 주간 리포트는 매주 갱신됩니다.</>,
    },
];

export default function MetricsPage() {
    return (
        /* [2026-10-30] 새 디자인: 모양만 바꿨다. 글·링크는 그대로다. */
        <main className="vh-main vh-article">
            <header className="vh-phead">
                <h1>지표 설명</h1>
                <p className="vh-lead">
                    Viral Hunter의 숫자가 무엇을 뜻하고 어떻게 계산되는지 정리했습니다.
                </p>
            </header>
            <dl className="vh-metrics">
                {ITEMS.map((it) => (
                    <div key={it.term} className="vh-card">
                        <dt>{it.term}</dt>
                        <dd>{it.body}</dd>
                    </div>
                ))}
            </dl>
            <div className="vh-note">
                <MetricsDisclosure />
                <p className="mt-2">
                    서비스 소개는 <Link href="/about">소개</Link> 페이지에 있습니다.
                </p>
            </div>
        </main>
    );
}
