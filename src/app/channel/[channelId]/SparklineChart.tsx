import type { SparklinePoint } from "@/lib/tier-channel-types";

/**
 * 일별 조회수 증가 추이 차트.
 *
 * recharts 가 이미 설치돼 있지만 클라이언트 전용이라 SSR HTML 에 차트가 담기지 않는다.
 * 이 페이지는 검색 노출이 목적이므로 인라인 SVG 서버 컴포넌트로 그리고,
 * SVG 는 크롤러가 수치로 읽지 못하므로 같은 데이터를 표로도 함께 렌더한다.
 * ("use client" 를 붙이지 않는 것이 의도적이다.)
 */

const W = 640;
const H = 160;
const PAD_X = 8;
const PAD_Y = 16;

function fmtKr(n: number): string {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천`;
    return n.toLocaleString();
}

function fmtDate(iso: string): string {
    const m = iso.match(/^\d{4}-(\d{2})-(\d{2})$/);
    return m ? `${parseInt(m[1], 10)}/${parseInt(m[2], 10)}` : iso;
}

export function SparklineChart({ points }: { points: SparklinePoint[] }) {
    const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
    const values = sorted.map((p) => p.view_increase ?? 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    // 전 구간이 같은 값(보통 전부 0)이면 분모가 0이 되므로 중앙 높이에 평평하게 그린다.
    const span = max - min || 1;
    const isFlat = max === min;

    const coords = sorted.map((p, i) => {
        const x =
            sorted.length === 1
                ? W / 2
                : PAD_X + (i * (W - PAD_X * 2)) / (sorted.length - 1);
        const ratio = isFlat ? 0.5 : ((p.view_increase ?? 0) - min) / span;
        const y = H - PAD_Y - ratio * (H - PAD_Y * 2);
        return { x, y, point: p };
    });

    // 날짜가 하루 이상 비면 선을 끊는다. 이어 그리면 측정되지 않은 구간이
    // 연속 측정된 것처럼 보여 추이를 왜곡한다.
    const segments: (typeof coords)[] = [];
    let run: typeof coords = [];
    for (let i = 0; i < coords.length; i++) {
        if (i > 0) {
            const prev = new Date(`${coords[i - 1].point.date}T00:00:00Z`).getTime();
            const cur = new Date(`${coords[i].point.date}T00:00:00Z`).getTime();
            if (cur - prev > 86_400_000) {
                segments.push(run);
                run = [];
            }
        }
        run.push(coords[i]);
    }
    if (run.length) segments.push(run);
    const gapCount = segments.length - 1;

    const totalViews = values.reduce((a, b) => a + b, 0);
    const totalSubs = sorted.reduce((a, p) => a + (p.sub_increase ?? 0), 0);

    return (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {/* 차트 */}
            <div className="border-b border-neutral-100 p-4">
                <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-[12px] text-neutral-400">
                        측정된 {sorted.length}일 조회수 증가 합계{" "}
                        <strong className="font-semibold text-neutral-700">
                            {fmtKr(totalViews)}회
                        </strong>
                    </span>
                    <span className="text-[12px] text-neutral-400">
                        구독자 증가 합계{" "}
                        <strong className="font-semibold text-neutral-700">
                            {fmtKr(totalSubs)}명
                        </strong>
                    </span>
                </div>
                {gapCount > 0 && (
                    <p className="mb-3 text-[11px] text-amber-700">
                        수집되지 않은 날이 있어 그래프 선이 {gapCount}곳 끊겨 있습니다.
                        측정된 날만 표시합니다.
                    </p>
                )}

                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="h-40 w-full"
                    role="img"
                    aria-label={`최근 ${sorted.length}일간 일별 조회수 증가 추이. 합계 ${fmtKr(totalViews)}회.`}
                    preserveAspectRatio="none"
                >
                    {segments.map((seg, si) => (
                        <polyline
                            key={`seg-${si}`}
                            points={seg.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ")}
                            fill="none"
                            stroke="#1A1A1A"
                            strokeWidth="2"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                    {coords.map((c) => (
                        <circle
                            key={c.point.date}
                            cx={c.x}
                            cy={c.y}
                            r="3"
                            fill="#FDFDFC"
                            stroke="#1A1A1A"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                </svg>
            </div>

            {/* 표 — 크롤러가 읽는 실제 수치 + 스크린리더 접근성 */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-[12px]">
                    <caption className="sr-only">일별 구독자 및 조회수 증가 추이</caption>
                    <thead>
                        <tr className="border-b border-neutral-100 text-neutral-400">
                            <th scope="col" className="px-4 py-2 font-medium">날짜</th>
                            <th scope="col" className="px-4 py-2 text-right font-medium">조회수 증가</th>
                            <th scope="col" className="px-4 py-2 text-right font-medium">구독자 증가</th>
                            <th scope="col" className="px-4 py-2 text-right font-medium">누적 구독자</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...sorted].reverse().map((p) => (
                            <tr key={p.date} className="border-b border-neutral-50 last:border-0">
                                <th scope="row" className="px-4 py-2 font-medium text-neutral-600">
                                    {fmtDate(p.date)}
                                </th>
                                <td className="px-4 py-2 text-right tabular-nums text-neutral-700">
                                    {(p.view_increase ?? 0) > 0 ? "+" : ""}
                                    {(p.view_increase ?? 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums text-neutral-700">
                                    {(p.sub_increase ?? 0) > 0 ? "+" : ""}
                                    {(p.sub_increase ?? 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums text-neutral-500">
                                    {(p.total_subscribers ?? 0).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
