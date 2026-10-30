
// 이용약관·개인정보처리방침 공통 틀. 읽기 좋은 폭으로 둔다. 머리·바닥글은 루트 레이아웃이 그린다.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
                <article className="prose prose-neutral max-w-none rounded-2xl bg-white p-6 sm:p-8 text-[14px] leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:underline">
                    {children}
                </article>
            </main>
        </div>
    );
}
