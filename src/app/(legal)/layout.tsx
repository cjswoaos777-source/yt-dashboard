import Link from "next/link";

// 이용약관·개인정보처리방침 공통 틀. 읽기 좋은 폭으로 둔다. 머리·바닥글은 루트 레이아웃이 그린다.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="vh-main vh-article">
            <Link href="/dashboard" className="vh-back">← Viral Hunter 대시보드</Link>
            <article className="vh-md vh-legal">{children}</article>
        </main>
    );
}
