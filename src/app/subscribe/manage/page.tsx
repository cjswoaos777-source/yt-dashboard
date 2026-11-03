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
        <main className="vh-main vh-small">
            <h1>리포트 메일 설정</h1>
                {sub ? (
                    <SubscribeManage token={t} email={sub.email_masked} frequency={sub.frequency} pending={sub.status === "pending"} />
                ) : (
                    <div className="vh-card vh-small-body">
                        <p>
                            구독 정보를 찾을 수 없어요. 이미 해지됐거나 링크가 잘못됐어요. 해지된 주소는 바로 지워져서 더는 메일이 가지 않아요.
                        </p>
                        <Link href="/ideas" className="vh-cta">
                            지금 만들 만한 영상 보기
                        </Link>
                    </div>
                )}
        </main>
    );
}
