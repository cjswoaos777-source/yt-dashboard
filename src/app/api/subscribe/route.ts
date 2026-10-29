import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { FREQUENCIES, type Frequency } from "@/lib/ideas";

/**
 * 리포트 메일 신청.
 *
 * 브라우저 → 이 라우트 → Supabase report_subscribe 함수 (anon 키, 표에는 직접 못 닿는다).
 * 함수는 이미 구독 중이든 아니든 'ok' 를 돌려준다 — 남의 주소가 구독 중인지 알아낼 수 없게.
 * 확인 메일은 파이프라인 PC 가 매시간 보낸다 (utube_rank/report_mail.py).
 */

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function fail(message: string, status = 400) {
    return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(req: Request) {
    let body: { email?: unknown; frequency?: unknown; consent?: unknown; website?: unknown; source?: unknown };
    try {
        body = await req.json();
    } catch {
        return fail("잘못된 요청이에요.");
    }
    // 봇 함정 칸이 채워져 왔으면 성공한 척하고 버린다
    if (body.website) return NextResponse.json({ ok: true });
    if (body.consent !== true) return fail("개인정보 수집·이용에 동의해 주셔야 보낼 수 있어요.");

    const email = String(body.email ?? "").trim();
    if (email.length > 254 || !EMAIL_RE.test(email)) return fail("이메일 주소를 확인해 주세요.");
    const frequency: Frequency = FREQUENCIES.includes(body.frequency as Frequency) ? (body.frequency as Frequency) : "weekly";
    const source = String(body.source ?? "").slice(0, 100);

    const { data, error } = await supabase().rpc("report_subscribe", {
        p_email: email,
        p_frequency: frequency,
        p_source: source,
    });
    if (error) return fail("잠시 뒤 다시 시도해 주세요.", 500);
    if (data === "invalid") return fail("이메일 주소를 확인해 주세요.");
    if (data === "busy") return fail("신청이 몰려 잠시 쉬고 있어요. 한 시간 뒤 다시 시도해 주세요.", 429);
    return NextResponse.json({ ok: true });
}
