import Link from "next/link";

/**
 * 후원 상자 (10-30). 리포트·만들 만한 영상처럼 직접 쓴 글의 끝에 둔다.
 * 유튜브 API 정책 III.G.1.d 는 데이터 페이지의 광고·스폰서 판매를 막고, III.I.20 은 방해되는 상업 메시지를 막는다.
 * 그래서 팝업·가림 없이 본문 끝에 조용히 두고, 결제 수단은 /about#support 에만 둔다.
 */
export function SupportBox({ className = "" }: { className?: string }) {
    return (
        <aside className={`flex flex-col gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-5 sm:flex-row sm:items-center ${className}`}>
            <p className="flex-1 text-[13.5px] leading-relaxed text-neutral-700">
                <strong className="text-neutral-900">도움이 되셨나요?</strong> Viral Hunter는 한 사람이 집 노트북으로 매시간 돌리는 무료
                서비스예요. 커피 한 잔 후원이 서버 비용에 큰 힘이 돼요. 후원과 관계없이 모든 기능은 계속 무료예요.
            </p>
            <Link
                href="/about#support"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#FF6B35] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#E55A28]"
            >
                ☕ 후원하기
            </Link>
        </aside>
    );
}
