// 사이트 전역 상수 — SEO/메타데이터에서 공통 사용
//
// url 은 sitemap·canonical·robots·JSON-LD·OG 이미지가 모두 참조하는 단일 출처다.
// 2026-09-01 yt-viralhunter.vercel.app 에서 자체 도메인으로 이전.
// vercel.app 은 공용 도메인이라 백링크·브랜드가 자산으로 남지 않아 옮겼다.
// 옛 주소는 Vercel Domains 설정에서 301 로 이 주소를 가리킨다.
export const SITE = {
    name: "Viral Hunter",
    url: "https://trend.readthe1stars.com",
    title: "유튜브 순위 분석 대시보드 - Viral Hunter",
    description:
        "떡상하는 유튜브 채널 순위, 숏츠와 롱폼 채널의 바이럴 지수를 분석하여 유튜버 성장을 위한 진짜 꿀통 채널을 찾아냅니다.",
    locale: "ko_KR",
} as const;
