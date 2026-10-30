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
        <main className="vh-main vh-article">
            <header className="vh-phead">
                <h1>주간 유튜브 트렌드 리포트</h1>
                <p className="vh-lead">
                    매주 월요일, 지난 한 주 한국 유튜브에서 무엇이 떴는지 Viral Hunter의 수집 데이터로 정리합니다.
                </p>
            </header>
            {reports.length === 0 ? (
                <p className="vh-note">첫 리포트를 준비 중입니다.</p>
            ) : (
                <ul className="vh-replist">
                    {reports.map((r) => (
                        <li key={r.slug}>
                            <Link href={`/report/${r.slug}`}>
                                <div className="vh-replist-p">{periodLabel(r.period_start, r.period_end)}</div>
                                <div className="vh-replist-t">{r.title}</div>
                                <p>{r.summary}</p>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
