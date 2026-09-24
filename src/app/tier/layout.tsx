import { SiteFooter } from "@/components/legal";

// 이 섹션은 사이드바 없이 단독 페이지로 그려진다. 약관·개인정보·자체 지표 고지
// 푸터만 붙인다 (YouTube API 정책 III.A, III.E.4.h).
export default function SectionLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <SiteFooter />
        </>
    );
}
