import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, GOOGLE_PRIVACY_URL, YOUTUBE_TOS_URL } from "@/components/legal";

export const metadata: Metadata = {
    title: "개인정보처리방침",
    description: "Viral Hunter 개인정보처리방침 — 수집하는 정보, 쿠키, YouTube API 서비스 이용에 관한 안내",
    alternates: { canonical: "/privacy", languages: { ko: "/privacy", en: "/privacy/en" } },
};

// 시행일을 바꿀 때는 아래 '변경 이력'에도 한 줄 남긴다. 영문판(/privacy/en)도 같이 고친다.
const EFFECTIVE_DATE = "2026년 10월 29일";

export default function PrivacyPage() {
    return (
        <>
            <p className="text-[12px]">한국어 · <Link href="/privacy/en">English</Link></p>
            <h1>개인정보처리방침</h1>
            <p className="text-neutral-500">시행일: {EFFECTIVE_DATE}</p>

            <p>
                Viral Hunter(이하 &ldquo;서비스&rdquo;, trend.readthe1stars.com)는 이용자의 개인정보를 소중히 다루며,
                어떤 정보를 어떻게 다루는지 아래와 같이 안내합니다.
            </p>

            <h2>1. 서비스가 직접 수집하는 개인정보</h2>
            <p>
                서비스는 회원가입·로그인 기능이 없으며, 이름·전화번호 등을 입력받지 않습니다. 이용자가 리포트 메일을
                신청한 경우에만 아래 2항의 정보를 받습니다. 이용자가 문의 메일({CONTACT_EMAIL})을 보내는 경우에는
                답변을 위해 보낸 사람의 이메일 주소와 문의 내용을 받은편지함에 보관합니다.
            </p>

            <h2 id="report-mail">2. 리포트 메일</h2>
            <ul>
                <li>수집 항목: 이메일 주소, 고른 받는 횟수, 신청·구독 확인·발송 시각, 신청한 페이지</li>
                <li>
                    이용 목적: &lsquo;지금 만들 만한 영상&rsquo; 리포트와 구독 확인 메일 발송에만 씁니다. 광고성 정보는
                    보내지 않습니다.
                </li>
                <li>
                    보관 기간: 구독을 해지하면 그 즉시 지웁니다. 구독 확인을 하지 않은 신청은 7일 뒤 자동으로 지웁니다.
                </li>
                <li>
                    처리 위탁과 국외 이전: 이메일 주소는 Supabase Inc.(미국)의 데이터베이스(서버 위치: 인도 뭄바이)에
                    저장되고, 메일은 Google LLC(미국)의 Gmail로 보냅니다. 신청할 때와 메일을 보낼 때 암호화된 통신으로
                    전송되며, 보관 기간은 위와 같습니다.
                </li>
                <li>
                    동의를 거부할 권리: 동의하지 않으면 리포트 메일을 받을 수 없을 뿐, 사이트 이용에는 제한이 없습니다.
                </li>
                <li>
                    받는 횟수 변경·해지: 모든 메일 아래의 &lsquo;받는 횟수 바꾸기·구독 해지&rsquo; 링크나 문의 메일로 언제든
                    할 수 있습니다.
                </li>
            </ul>

            <h2>3. 방문 통계와 쿠키 (Google Analytics)</h2>
            <p>
                서비스는 이용 현황을 파악하기 위해 Google Analytics 4를 사용합니다. Google Analytics는 쿠키를 통해
                방문한 페이지, 체류 시간, 유입 경로, 기기·브라우저 종류, 대략적인 지역 등 개인을 직접 식별하지 않는
                이용 정보를 수집하며, 이 정보는 Google이 처리합니다.
            </p>
            <ul>
                <li>브라우저 설정에서 쿠키 저장을 거부할 수 있습니다.</li>
                <li>
                    Google Analytics 수집을 원하지 않으면{" "}
                    <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">
                        Google Analytics 차단 브라우저 부가기능
                    </a>
                    을 설치할 수 있습니다.
                </li>
            </ul>

            <h2>4. 서버 기록</h2>
            <p>
                서비스는 Vercel에서 호스팅되며, 안정적인 운영과 보안을 위해 접속 IP 주소, 요청 시각, 브라우저 정보 등
                일반적인 서버 기록이 호스팅 업체에 일시적으로 남을 수 있습니다. 서비스는 이 기록으로 이용자를 식별하지
                않습니다.
            </p>

            <h2>5. YouTube API 서비스 이용</h2>
            <p>
                서비스는 YouTube API 서비스를 사용해 공개된 YouTube 영상·채널 정보(제목, 조회수, 구독자 수 등)를
                가져와 보여 줍니다.
            </p>
            <ul>
                <li>
                    서비스는 이용자의 YouTube·Google 계정에 접근하지 않으며, 이용자에게 어떤 계정 권한도 요청하지
                    않습니다.
                </li>
                <li>
                    YouTube에서 받은 데이터는 서비스 제공에 필요한 기간 동안만 보관하며, 30일을 넘기지 않고 다시
                    가져와 갱신하거나 삭제합니다.
                </li>
                <li>
                    서비스를 이용하면{" "}
                    <a href={YOUTUBE_TOS_URL} target="_blank" rel="noopener noreferrer">YouTube 서비스 약관</a>
                    이 함께 적용됩니다. YouTube와 Google이 데이터를 처리하는 방식은{" "}
                    <a href={GOOGLE_PRIVACY_URL} target="_blank" rel="noopener noreferrer">
                        Google 개인정보처리방침(http://www.google.com/policies/privacy)
                    </a>
                    을 따릅니다.
                </li>
            </ul>

            <h2>6. 제3자 제공</h2>
            <p>
                서비스는 이용자의 개인정보를 판매하거나 제3자에게 제공하지 않습니다. 위에 적은 Google(분석·메일 발송),
                Supabase(리포트 메일 주소 저장), Vercel(호스팅)이 서비스 운영을 위해 정보를 처리할 뿐입니다.
            </p>

            <h2>7. 문의</h2>
            <p>
                개인정보와 관련한 문의는 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> 으로 보내 주세요.
            </p>

            <h2>8. 변경 이력</h2>
            <ul>
                <li>2026년 9월 25일: 최초 게시</li>
                <li>2026년 10월 29일: 리포트 메일(이메일 주소 수집) 항목 추가</li>
            </ul>
        </>
    );
}
