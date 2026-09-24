import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, GOOGLE_PRIVACY_URL, YOUTUBE_TOS_URL } from "@/components/legal";

export const metadata: Metadata = {
    title: "이용약관",
    description: "Viral Hunter 이용약관 — YouTube API 서비스 이용, 자체 계산 지표, 책임의 한계",
    alternates: { canonical: "/terms" },
};

const EFFECTIVE_DATE = "2026년 9월 25일";

export default function TermsPage() {
    return (
        <>
            <h1>이용약관</h1>
            <p className="text-neutral-500">시행일: {EFFECTIVE_DATE}</p>

            <h2>1. 서비스 소개</h2>
            <p>
                Viral Hunter(trend.readthe1stars.com, 이하 &ldquo;서비스&rdquo;)는 공개된 YouTube 영상·채널 정보를
                모아 조회수 증가 추세를 보여 주는 무료 정보 서비스입니다. 서비스는 YouTube 또는 Google과 제휴하거나
                그들의 보증을 받은 서비스가 아닙니다.
            </p>

            <h2>2. YouTube 서비스 약관</h2>
            <p>
                서비스는 YouTube API 서비스를 사용합니다.{" "}
                <strong>
                    서비스를 이용함으로써 이용자는{" "}
                    <a href={YOUTUBE_TOS_URL} target="_blank" rel="noopener noreferrer">YouTube 서비스 약관</a>
                    에 동의하고 그 적용을 받는 것에 동의합니다.
                </strong>{" "}
                YouTube 데이터의 처리에 관해서는{" "}
                <a href={GOOGLE_PRIVACY_URL} target="_blank" rel="noopener noreferrer">Google 개인정보처리방침</a>
                을, 이 서비스의 개인정보 처리에 관해서는 <Link href="/privacy">개인정보처리방침</Link>을 확인해 주세요.
            </p>

            <h2>3. 자체 계산 지표</h2>
            <p>
                급상승 순위, 시간당 조회수·좋아요·댓글 증가량, 구독자 구간, 채널 성장 지표, 인사이트 통계 등은
                서비스가 YouTube API 서비스로 받은 공개 데이터를 바탕으로 자체 계산한 값입니다.{" "}
                <strong>이 지표들은 YouTube가 제공하거나 보증하는 수치가 아니며</strong>, 수집 시점과 방식에 따라 실제와
                차이가 있을 수 있습니다.
            </p>

            <h2>4. 이용 제한</h2>
            <ul>
                <li>서비스의 정보를 자동화된 수단으로 대량 수집하거나, 재판매·재배포하는 행위를 금지합니다.</li>
                <li>서비스 운영을 방해하는 과도한 요청을 보내서는 안 됩니다.</li>
            </ul>

            <h2>5. 책임의 한계</h2>
            <p>
                서비스는 정보를 &ldquo;있는 그대로&rdquo; 제공하며, 정보의 정확성·완전성·최신성을 보장하지 않습니다.
                이용자가 서비스의 정보를 바탕으로 내린 판단에 대해 서비스는 책임지지 않습니다. 서비스는 사전 예고 없이
                변경되거나 중단될 수 있습니다.
            </p>

            <h2>6. 콘텐츠 권리</h2>
            <p>
                영상 제목, 썸네일, 채널명 등 YouTube 콘텐츠의 권리는 각 제작자와 YouTube에 있습니다. 권리자가 표시
                중단을 원하시면 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> 으로 알려 주세요.
            </p>

            <h2>7. 약관 변경과 문의</h2>
            <p>
                약관이 바뀌면 이 페이지에 시행일과 함께 게시합니다. 문의는{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> 으로 보내 주세요.
            </p>
        </>
    );
}
