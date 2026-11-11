/**
 * 채널 상세의 검색 결과 제목 — 채널마다 다른 사실로 만든다.
 *
 * [2026-11-11] 전에는 모든 채널이 'X 채널 분석 — 구독자·조회수 추이' 한 틀이었다.
 * 이름만 바뀌는 제목은 검색엔진이 '찍어낸 페이지'로 보기 쉬워서,
 * 그 채널의 구독자 규모·분야·형식·특징을 넣는다. 해당하지 않는 것은 뺀다.
 * 날마다 크게 흔들리는 숫자(떠오르는 순위, 조회수 백분위)는 넣지 않는다.
 */
import { CATEGORY_META } from "@/lib/categories";

const LEAGUE_SHORT: Record<string, string> = {
    SHORTS: "숏츠",
    LONG: "롱폼",
    HYBRID: "숏츠·롱폼",
};

/** 제목에 쓸 만한 특징 꼬리표. 앞에 있을수록 먼저 고른다. (channel-insight.ts 의 tags) */
const TRAIT_ORDER = ["빠른 성장", "순위 단골", "한 방형", "꾸준형", "거의 매일 업로드", "반응 좋음"];

/** 카테고리 순위 페이지가 없는 분류의 한글 이름 (categories.ts 에 없는 것) */
const OTHER_LABEL: Record<string, string> = {
    "News & Politics": "뉴스·정치",
    "Science & Technology": "과학·기술",
    "Autos & Vehicles": "자동차",
    "Nonprofits & Activism": "비영리·사회운동",
    Overall: "",
};

export function categoryLabel(mainCategory: string): string {
    const hit = Object.values(CATEGORY_META).find((m) => m.category === mainCategory);
    return hit?.label ?? OTHER_LABEL[mainCategory] ?? mainCategory;
}

export function buildChannelTitle(a: {
    name: string;
    subsText: string;
    mainCategory: string;
    league?: string | null;
    isCurrent: boolean;
    categoryRank: number;
    daysSeen: number;
    tags: string[];
}): string {
    const cat = categoryLabel(a.mainCategory);
    const league = a.league ? LEAGUE_SHORT[a.league] : "";
    const parts = [`구독자 ${a.subsText}`];

    if (cat && a.isCurrent && a.categoryRank > 0 && a.categoryRank <= 100) {
        parts.push(`${cat} 구독자 ${a.categoryRank}위`);
        if (league) parts.push(`${league} 채널`);
    } else {
        parts.push(`${[cat, league].filter(Boolean).join(" ")} 채널`.trim());
    }

    const trait =
        TRAIT_ORDER.find((t) => a.tags.includes(t)) ??
        a.tags.find((t) => t.endsWith(" 업로드"));
    if (trait) parts.push(trait);
    else if (!a.isCurrent && a.daysSeen > 0) parts.push(`순위 ${a.daysSeen}일 기록`);

    return `${a.name} 채널 분석 — ${parts.slice(0, 3).join(" · ")}`;
}
