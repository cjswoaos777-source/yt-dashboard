import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedReports } from "@/lib/reports";

export const metadata: Metadata = {
    title: "주간 유튜브 트렌드 리포트",
    description:
        "매주 한국 유튜브에서 무엇이 뜨고 있는지 데이터로 정리합니다. 조회수 TOP 10, 카테고리별 흐름, 구독자 1만 미만 채널의 급상승, 신규 채널까지.",
    alternates: { canonical: "/report" },
};

function periodLabel(start: string, end: string): string {
    const f = (d: string) => d.slice(5).replace("-", ".");
    return `${start.slice(0, 4)}.${f(start)} ~ ${f(end)}`;
}

export default function ReportListPage() {
    const reports = getPublishedReports();
    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
                <h1
                    className="mb-3 font-serif text-3xl font-bold tracking-tight text-[#1A1A1A] md:text-4xl"
                    style={{ fontFamily: "var(--font-playfair), serif" }}
                >
                    주간 유튜브 트렌드 리포트
                </h1>
                <p className="mb-10 text-[15px] leading-relaxed text-neutral-500">
                    매주 월요일, 지난 한 주 한국 유튜브에서 무엇이 떴는지 Viral Hunter의 수집 데이터로 정리합니다.
                </p>
                {reports.length === 0 ? (
                    <p className="text-[14px] text-neutral-400">첫 리포트를 준비 중입니다.</p>
                ) : (
                    <ul className="space-y-3">
                        {reports.map((r) => (
                            <li key={r.slug}>
                                <Link
                                    href={`/report/${r.slug}`}
                                    className="block rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:border-neutral-300 hover:shadow-sm"
                                >
                                    <div className="text-[12px] font-medium text-violet-600">{periodLabel(r.period_start, r.period_end)}</div>
                                    <div className="mt-1 text-[17px] font-bold text-[#1A1A1A]">{r.title}</div>
                                    <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{r.summary}</p>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
}
