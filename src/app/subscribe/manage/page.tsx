import Link from "next/link";
import type { Metadata } from "next";
import { getSubscription } from "@/lib/subscribe";
import { SubscribeManage } from "@/components/subscribe-manage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "리포트 메일 설정",
    robots: { index: false, follow: false },
};

export default async function ManagePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
    const { t = "" } = await searchParams;
    const sub = await getSubscription(t);

    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
                <h1 className="mb-6 text-2xl font-bold text-[#1A1A1A]">리포트 메일 설정</h1>
                {sub ? (
                    <SubscribeManage token={t} email={sub.email_masked} frequency={sub.frequency} pending={sub.status === "pending"} />
                ) : (
                    <div className="text-[14px] leading-relaxed text-neutral-600">
                        <p className="mb-6">
                            구독 정보를 찾을 수 없어요. 이미 해지됐거나 링크가 잘못됐어요. 해지된 주소는 바로 지워져서 더는 메일이 가지 않아요.
                        </p>
                        <Link href="/ideas" className="rounded-full bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white">
                            지금 만들 만한 영상 보기
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
