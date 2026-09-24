import Link from "next/link";
import { SiteFooter } from "@/components/legal";

// 이용약관·개인정보처리방침 공통 틀. 사이드바 없이 읽기 좋은 폭으로 둔다.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
                <Link href="/dashboard" className="text-[12px] text-neutral-400 hover:text-neutral-700">← Viral Hunter 대시보드</Link>
                <article className="prose prose-neutral mt-6 max-w-none text-[14px] leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:underline">
                    {children}
                </article>
            </main>
            <SiteFooter />
        </div>
    );
}
