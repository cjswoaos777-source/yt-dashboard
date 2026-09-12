import { renderUrlset, xmlResponse, pagesUrls, channelUrls } from "@/lib/sitemap-parts";

/**
 * 사이트맵 조각.
 *
 *   pages     정적 페이지 + 공지 (네트워크 의존 없음)
 *   channels  채널 상세 — channel_archive 에서 등장 일수 기준으로 고른다
 *
 * 그 밖의 이름(옛 인덱스가 등록해 둔 channels-N / tags-N 등)은 빈 XML 로 답해
 * 서치콘솔이 자연스럽게 잊도록 한다. HTML 404 를 주면 사이트맵 전체가
 * 거부되므로 반드시 XML 을 반환한다.
 */
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
    if (name === "channels") {
        return xmlResponse(renderUrlset(await channelUrls()));
    }
    return xmlResponse(renderUrlset([]));
}
