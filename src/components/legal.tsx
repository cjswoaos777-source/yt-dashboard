import Link from "next/link";

/**
 * YouTube API Services 정책 준수용 공통 요소.
 *
 * [2026-09-25] 쿼터 증설 심사(API Compliance Audit) 준비.
 *   III.A.1  YouTube 서비스 약관 링크 + "이용 시 약관에 동의" 고지
 *   III.A.2  개인정보처리방침(구글 개인정보처리방침 링크 포함)
 *   III.E.4.h 자체 계산 지표는 "YouTube 제공 수치가 아님"을 지표가 보이는 곳에
 *             명확히 고지해야 허용된다.
 */

export const YOUTUBE_TOS_URL = "https://www.youtube.com/t/terms";
export const GOOGLE_PRIVACY_URL = "https://policies.google.com/privacy";
export const CONTACT_EMAIL = "cjswoaos777@gmail.com";

/** 자체 지표 고지 문구. 지표가 보이는 페이지 상단 가까이에 둔다. */
export function MetricsDisclosure({ className = "" }: { className?: string }) {
    return (
        <p className={`text-[11px] leading-relaxed text-neutral-400 ${className}`}>
            순위·시간당 증가량·구독자 구간·성장 지표는 Viral Hunter가 YouTube API
            서비스로 받은 공개 데이터를 바탕으로 <strong className="font-semibold text-neutral-500">자체 계산한 지표</strong>이며,
            YouTube가 제공하거나 보증하는 수치가 아닙니다.
        </p>
    );
}

/** 전 페이지 공통 푸터 */
export function SiteFooter({ className = "" }: { className?: string }) {
    return (
        <footer className={`mx-auto w-full max-w-7xl px-4 pb-8 pt-6 sm:px-6 lg:px-10 ${className}`}>
            <div className="border-t border-neutral-100 pt-5 text-center text-[12px] text-neutral-400 space-y-2">
                <MetricsDisclosure className="mx-auto max-w-2xl" />
                <p>
                    이 서비스는 YouTube API 서비스를 사용합니다. 이용 시{" "}
                    <a href={YOUTUBE_TOS_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-neutral-700">
                        YouTube 서비스 약관
                    </a>
                    에 동의하는 것으로 간주됩니다.
                </p>
                <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                    <Link href="/terms" className="hover:text-neutral-700">이용약관</Link>
                    <span aria-hidden>·</span>
                    <Link href="/privacy" className="font-semibold text-neutral-500 hover:text-neutral-800">개인정보처리방침</Link>
                    <span aria-hidden>·</span>
                    <a href={GOOGLE_PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="hover:text-neutral-700">Google 개인정보처리방침</a>
                    <span aria-hidden>·</span>
                    <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-neutral-700">문의: {CONTACT_EMAIL}</a>
                </nav>
            </div>
        </footer>
    );
}
