import { supabase } from "@/lib/supabase";
import type { Frequency } from "@/lib/ideas";

/** 메일 링크에 들어가는 구독 토큰 (Supabase report_subscribers.token, uuid). */
const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isToken(t: unknown): t is string {
    return typeof t === "string" && TOKEN_RE.test(t);
}

export interface Subscription {
    email_masked: string;
    frequency: Frequency;
    status: "pending" | "active";
}

/** 관리 화면용. 없는 토큰이면 null. 캐시하지 않는다 (바꾼 값이 바로 보여야 한다). */
export async function getSubscription(t: string): Promise<Subscription | null> {
    if (!isToken(t)) return null;
    const { data, error } = await supabase().rpc("report_get", { p_token: t });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return data[0] as Subscription;
}

/** 확인 링크. 'confirmed' | 'already' | 'invalid' */
export async function confirmSubscription(t: string): Promise<string> {
    if (!isToken(t)) return "invalid";
    const { data, error } = await supabase().rpc("report_confirm", { p_token: t });
    return error ? "error" : String(data);
}
