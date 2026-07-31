/**
 * 채널 상세 페이지를 생성할 최소 구독자 기준.
 * 이보다 작은 채널은 보여줄 지표가 빈약해 thin content 로 판정될 위험이 있어 제외한다.
 * (실측: 전체 8,000개 중 1만 이상이 약 1,156개)
 *
 * 서버 전용 코드(unstable_cache 등)를 끌어오지 않도록 클라이언트 컴포넌트에서도
 * 안전하게 import 할 수 있는 별도 모듈로 분리해 둔다.
 */
export const CHANNEL_PAGE_MIN_SUBSCRIBERS = 10_000;

/** 해당 채널의 상세 페이지가 존재하는지 (= 내부 링크를 걸어도 되는지) */
export function hasChannelPage(subscriberCount: number | null | undefined): boolean {
    return (subscriberCount ?? 0) >= CHANNEL_PAGE_MIN_SUBSCRIBERS;
}
