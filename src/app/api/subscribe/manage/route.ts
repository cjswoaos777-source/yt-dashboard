import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { FREQUENCIES, type Frequency } from "@/lib/ideas";
import { isToken } from "@/lib/subscribe";

/** 관리 화면의 '받는 횟수 바꾸기'와 '구독 해지'. 메일마다 들어 있는 토큰으로만 바꿀 수 있다. */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    let body: { t?: unknown; action?: unknown; frequency?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
    const t = String(body.t ?? "");
    if (!isToken(t)) return NextResponse.json({ ok: false }, { status: 400 });

    if (body.action === "frequency") {
        if (!FREQUENCIES.includes(body.frequency as Frequency)) return NextResponse.json({ ok: false }, { status: 400 });
        const { data, error } = await supabase().rpc("report_set_frequency", { p_token: t, p_frequency: body.frequency });
        return NextResponse.json({ ok: !error && data === "ok" }, { status: error ? 500 : 200 });
    }
    if (body.action === "unsubscribe") {
        const { error } = await supabase().rpc("report_unsubscribe", { p_token: t });
        return NextResponse.json({ ok: !error }, { status: error ? 500 : 200 });
    }
    return NextResponse.json({ ok: false }, { status: 400 });
}
