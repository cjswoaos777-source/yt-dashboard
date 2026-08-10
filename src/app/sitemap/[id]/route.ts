import { renderUrlset, xmlResponse, pagesUrls } from "@/lib/sitemap-parts";

// 과거 사이트맵 인덱스가 서치콘솔에 등록해 둔 조각 URL(pages / channels-N / tags-N)이
// 한동안 계속 요청된다. 채널·태그 조각은 색인 제외 정책에 따라 빈 XML 로 답해
// 서치콘솔이 해당 URL 들을 자연스럽게 잊도록 한다. (HTML 404 를 주면 사이트맵
// 전체가 거부되므로 반드시 XML 을 반환한다.)
export const dynamic = "force-dynamic";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const name = decodeURIComponent(id).replace(/\.xml$/, "");

    if (name === "pages") {
        return xmlResponse(renderUrlset(pagesUrls()));
    }
    return xmlResponse(renderUrlset([]));
}
