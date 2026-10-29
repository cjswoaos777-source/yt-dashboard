import Link from "next/link";
import type { Metadata } from "next";
import { confirmSubscription } from "@/lib/subscribe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "리포트 메일 구독 확인",
    robots: { index: false, follow: false },
};

const MESSAGES: Record<string, { title: string; body: string }> = {
    confirmed: {
        title: "구독이 시작됐어요",
        body: "첫 리포트는 한 시간 안에 보내 드려요 (밤 10시~아침 8시에는 아침 8시에). 그다음부터는 고르신 횟수대로 아침에 보내 드려요.",
    },
    already: { title: "이미 구독 중이에요", body: "따로 하실 일은 없어요. 리포트는 고르신 횟수대로 보내 드려요." },
    invalid: {
        title: "링크가 맞지 않아요",
        body: "확인하지 않은 신청은 7일 뒤 지워져요. 기간이 지났다면 아래에서 다시 신청해 주세요.",
    },
    error: { title: "잠시 문제가 생겼어요", body: "잠시 뒤 메일의 링크를 다시 눌러 주세요." },
};

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
    const { t = "" } = await searchParams;
    const result = await confirmSubscription(t);
    const m = MESSAGES[result] ?? MESSAGES.invalid;
    const ok = result === "confirmed" || result === "already";

    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
                <h1 className="mb-3 text-2xl font-bold text-[#1A1A1A]">{m.title}</h1>
                <p className="mb-8 text-[14px] leading-relaxed text-neutral-600">{m.body}</p>
                <div className="flex flex-wrap gap-2">
                    <Link href="/ideas" className="rounded-full bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white">
                        지금 만들 만한 영상 보기
                    </Link>
                    {ok && (
                        <Link href={`/subscribe/manage?t=${t}`} className="rounded-full border border-neutral-300 px-4 py-2 text-[13px] text-neutral-700">
                            받는 횟수 바꾸기
                        </Link>
                    )}
                </div>
            </main>
        </div>
    );
}
