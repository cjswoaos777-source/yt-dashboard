import Link from "next/link";
import { CONTACT_EMAIL, GOOGLE_PRIVACY_URL, YOUTUBE_TOS_URL } from "@/components/legal";

/**
 * 사이트 바닥글 (2026-10-30 새 디자인). 예전 SiteFooter(약관·자체 지표 고지·YouTube 약관)와
 * 사이드바 링크를 한곳에 모은다. YouTube API 정책 III.A(약관·개인정보), III.E.4.h(자체 지표 고지).
 */
export function SiteFooterNew() {
    return (
        <footer className="vh-footer">
            <div className="vh-footer-in">
                <div className="vh-footer-cols">
                    <div>
                        <b>순위</b>
                        <Link href="/dashboard">지금 뜨는 영상</Link>
                        <Link href="/channel">떠오르는 채널</Link>
                        <Link href="/category">카테고리별 순위</Link>
                        <Link href="/tier">구독자 구간별 순위</Link>
                    </div>
                    <div>
                        <b>분석</b>
                        <Link href="/ideas">지금 만들 만한 영상</Link>
                        <Link href="/report">주간 리포트</Link>
                        <Link href="/dashboard/benchmarking">벤치마킹</Link>
                        <Link href="/tag">태그</Link>
                        <Link href="/insights">인사이트</Link>
                    </div>
                    <div>
                        <b>안내</b>
                        <Link href="/about">소개</Link>
                        <Link href="/about/metrics">지표 설명</Link>
                        <Link href="/notice">공지사항</Link>
                        <Link href="/about#support" className="vh-footer-support">☕ 후원하기</Link>
                    </div>
                    <div>
                        <b>약관</b>
                        <Link href="/terms">이용약관</Link>
                        <Link href="/privacy">개인정보처리방침</Link>
                        <a href={GOOGLE_PRIVACY_URL} target="_blank" rel="noopener noreferrer">Google 개인정보처리방침</a>
                        <a href={`mailto:${CONTACT_EMAIL}`}>문의: {CONTACT_EMAIL}</a>
                    </div>
                </div>
                <p>
                    순위·시간당 증가량·구독자 구간·성장 지표는 Viral Hunter가 YouTube API 서비스로 받은 공개 데이터를 바탕으로{" "}
                    <b>자체 계산한 지표</b>이며, YouTube가 제공하거나 보증하는 수치가 아닙니다. 이 서비스는 YouTube API 서비스를
                    사용합니다. 이용 시{" "}
                    <a href={YOUTUBE_TOS_URL} target="_blank" rel="noopener noreferrer">
                        YouTube 서비스 약관
                    </a>
                    에 동의하는 것으로 간주됩니다.
                </p>
            </div>
        </footer>
    );
}
