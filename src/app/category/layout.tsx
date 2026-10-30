// [2026-10-30 새 디자인] 약관·자체 지표 고지 바닥글은 루트 레이아웃의 공통 바닥글로 옮겼다
// (YouTube API 정책 III.A, III.E.4.h).
export default function SectionLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
