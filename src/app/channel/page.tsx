import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { ChannelBoardClient } from "./ChannelBoardClient";
import { isDefaultBoardQuery, parseBoardQuery, type BoardChannel } from "@/lib/channel-board";
import { cachedBoard } from "@/lib/channel-board-server";
import { SITE } from "@/lib/site";

/*
 * 지금 뜨는 채널 (2026-10-31, 사용자 결정).
 *
 * 예전에는 이 주소가 필터 없는 표('떠오르는 채널', 100곳씩 쪽 나눔)였고, 필터는 더보기 메뉴의
 * 벤치마킹(/dashboard/benchmarking)에 따로 있었다. 둘 다 같은 8,000곳을 다른 순서로 보여 줬다.
 * 이제 국내 채널 전부를 이 화면 하나에서 영상 순위처럼 필터로 본다. 벤치마킹 주소는 여기로 보낸다.
 *
 * 필터 화면이 useSearchParams 를 쓰므로 정적 생성하면 목록이 HTML 에서 빠진다. 크롤러가 목록과
 * 채널 링크를 보도록 서버에서 그린다.
 */
export const dynamic = "force-dynamic";

/** 서버가 HTML 에 그려 두는 줄 수. 나머지(최대 1,000곳)는 화면이 뜬 뒤 받는다. */
const SSR_ROWS = 100;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
    const q = parseBoardQuery(await searchParams);
    return {
        title: "지금 뜨는 유튜브 채널 순위 TOP 1000",
        description:
            "구독자에 비해 조회수가 가장 빠르게 느는 국내 유튜브 채널 순위. 최근 7일 안에 영상이 뜬 국내 채널 전부를 " +
            "매일 다시 재서 줄을 세웁니다. 쇼츠·롱폼, 구독자 규모, 카테고리, 채널 나이별로 최대 1,000위까지 확인하세요.",
        alternates: { canonical: "/channel" },
        openGraph: {
            title: "지금 뜨는 유튜브 채널 순위 TOP 1000 | Viral Hunter",
            description: "구독자에 비해 조회수가 빠르게 느는 국내 유튜브 채널을 매일 줄 세웁니다.",
            url: `${SITE.url}/channel`,
            type: "website",
        },
        // 필터를 건 주소는 검색엔진에 따로 내보내지 않는다. 같은 목록의 변형이 수백 개 생기기 때문이다.
        ...(!isDefaultBoardQuery(q) && { robots: { index: false, follow: true } }),
    };
}

export default async function ChannelBoardPage({ searchParams }: { searchParams: SearchParams }) {
    const sp = await searchParams;
    // 예전 표의 쪽 주소(?page=2~)는 첫 화면으로 보낸다. 이제 한 화면에서 '더 보기'로 이어 본다.
    if (sp.page !== undefined) permanentRedirect("/channel");

    const q = parseBoardQuery(sp);
    let rows: BoardChannel[] = [];
    let total = 0;
    // 조회가 실패한 채로 그리면 빈 목록이 CDN 에 1시간 남아 크롤러가 채널 링크를 못 본다
    // (2026-11-04 배포 직후 실측: 표를 막 바꾼 뒤라 첫 조회가 느렸다). 몇 번 더 해 본다.
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            ({ rows, total } = await cachedBoard(q));
            break;
        } catch {
            // 그래도 실패하면 빈 목록으로 그리고, 화면이 뜬 뒤 다시 받는다.
            if (attempt < 2) await new Promise((r) => setTimeout(r, 800));
        }
    }

    const itemListLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "지금 뜨는 유튜브 채널 순위",
        url: `${SITE.url}/channel`,
        numberOfItems: Math.min(rows.length, 10),
        itemListElement: rows.slice(0, 10).map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.channel_title,
            url: c.has_page ? `${SITE.url}/channel/${c.channel_id}` : `https://www.youtube.com/channel/${c.channel_id}`,
        })),
    };

    return (
        <>
            {rows.length > 0 && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
                />
            )}
            <ChannelBoardClient
                initialRows={rows.slice(0, SSR_ROWS)}
                initialTotal={total}
                initialQuery={q}
                updatedDate={rows[0]?.target_date ?? null}
            />
            <BoardMethod />
        </>
    );
}

/**
 * 순위 산정 방식 (서버에서 그리는 고정 글). 영상 순위(/dashboard)의 RankingMethod 와 같은 취지다.
 * 목록은 날마다 바뀌므로, 이 페이지가 무엇을 어떻게 재는지 바뀌지 않는 글로 밝힌다.
 * 숫자는 sp_build_channel_board·channel_board_sync.py 의 정의와 맞춘다.
 */
function BoardMethod() {
    const items: { term: string; body: React.ReactNode }[] = [
        {
            term: "대상",
            body: <>최근 7일 안에 수집된 영상을 올린 국내 채널 전부입니다. 최근 30일 동안 수집된 영상의 절반 이상이 한국어인 채널을 국내 채널로 봅니다. 몇 곳을 미리 골라 두지 않고, 하루 평균을 낼 만큼 숫자가 쌓인 채널을 모두 줄 세웁니다.</>,
        },
        {
            term: "줄 세우는 기준",
            body: <>채널의 구독자 수와 전체 조회수를 매일 저녁 새로 받아 <strong>하루 평균 얼마나 늘었는지</strong>를 계산합니다. 기본인 떠오르는 순은 하루 조회수 증가를 구독자 수(가상의 구독자 1만 명을 더한 값)로 나눈 값이라, 구독자에 비해 조회수가 빠르게 느는 채널이 위에 옵니다. 조회수 증가·구독자 증가·바이럴 점수(최근 7일 영상 평균 조회수 ÷ 구독자)로도 정렬할 수 있습니다.</>,
        },
        {
            term: "갱신",
            body: <>하루 한 번, 저녁 수집이 끝난 뒤 새 집계로 바뀝니다. 화면 위의 날짜가 지금 보고 있는 집계일입니다.</>,
        },
        {
            term: "필터",
            body: <>형식(쇼츠·롱폼·쇼츠+롱폼, 최근 30일 영상 비율), 구독자 규모, 카테고리, 채널 나이(유튜브에 표시된 개설일)로 나눠 볼 수 있습니다. 필터마다 상위 1,000곳까지 보여 줍니다.</>,
        },
        {
            term: "읽을 때 주의",
            body: <>유튜브는 채널 조회수를 며칠씩 멈췄다가 한꺼번에 올리기도 해서 하루 값보다 며칠 평균이 정확합니다. 구독자 수는 유튜브가 앞 세 자리까지만 공개해서(예: 123,456명 → 12.3만 명) 큰 채널일수록 계단처럼 늘어 보입니다. 채널을 합치거나 비공개 영상을 다시 열어 구독자는 그대로인데 조회수만 한꺼번에 뛴 날은 계산에서 뺍니다. 순위와 증가량은 YouTube API의 공개 데이터로 자체 계산한 값이며, YouTube가 제공하거나 보증하는 수치가 아닙니다.</>,
        },
    ];
    return (
        <div className="vh-main" style={{ paddingTop: 0 }}>
            <section className="vh-method" aria-labelledby="board-method">
                <h2 id="board-method">이 순위는 이렇게 매깁니다</h2>
                <dl>
                    {items.map((it) => (
                        <div key={it.term}>
                            <dt>{it.term}</dt>
                            <dd>{it.body}</dd>
                        </div>
                    ))}
                </dl>
                <p>
                    계산 방법은 <Link href="/about/metrics">지표 설명</Link>, 카테고리마다 뜨는 유튜버는{" "}
                    <Link href="/category">카테고리 순위</Link>, 지금 조회수가 오르는 영상은{" "}
                    <Link href="/dashboard">지금 뜨는 영상</Link>에서 볼 수 있습니다.
                </p>
            </section>
        </div>
    );
}
