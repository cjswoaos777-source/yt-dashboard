import { renderUrlset, xmlResponse, pagesUrls } from "@/lib/sitemap-parts";

// 채널·태그 상세는 데이터 셋이 매일 크게 회전해(채널 ~17%/일, 태그 ~45%/일)
// 색인시켜도 곧 404 가 되므로 사이트맵에서 제외하고 페이지에도 noindex 를 달았다.
// 남는 것은 URL 이 안정적인 정적 페이지 + 공지뿐이라 인덱스 없이 단일 urlset 으로 충분하다.
export const dynamic = "force-dynamic";

export async function GET() {
    return xmlResponse(renderUrlset(pagesUrls()));
}
