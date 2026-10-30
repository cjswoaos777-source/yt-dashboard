// [2026-10-30 새 디자인] 왼쪽 사이드바와 바닥글은 루트 레이아웃의 공통 머리·바닥글로 옮겼다.
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className="mx-auto w-full max-w-7xl">{children}</div>;
}
