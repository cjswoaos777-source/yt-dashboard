import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isToken } from "@/lib/subscribe";

/**
 * 메일 앱의 '구독 취소' 버튼 (List-Unsubscribe-Post: One-Click, RFC 8058).
 * 메일 앱이 POST 로 부르면 바로 해지(행 삭제)한다.
 *
 * 주소를 그냥 열면(GET) 해지하지 않고 관리 화면으로 보낸다 —
 * 메일 보안 검사기가 링크를 미리 열어 보는 것만으로 해지되면 안 되기 때문이다.
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const t = new URL(req.url).searchParams.get("t") ?? "";
    if (!isToken(t)) return new NextResponse(null, { status: 400 });
    const { error } = await supabase().rpc("report_unsubscribe", { p_token: t });
    return new NextResponse(null, { status: error ? 500 : 200 });
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const t = url.searchParams.get("t") ?? "";
    return NextResponse.redirect(new URL(`/subscribe/manage${isToken(t) ? `?t=${t}` : ""}`, url.origin));
}
