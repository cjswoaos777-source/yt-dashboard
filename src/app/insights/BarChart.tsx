/**
 * 가로 막대 차트 (서버 컴포넌트).
 *
 * SVG 는 크롤러가 수치로 읽지 못하므로 CSS 막대 + 실제 숫자 텍스트로 만든다.
 * "use client" 를 붙이지 않는 것이 의도적이다. 검색 노출이 목적인 페이지라
 * 값이 HTML 에 그대로 담겨야 한다.
 */

export interface BarRow {
    label: string;
    value: number;
    /** 막대 아래 작게 붙는 보조 설명 (예: 영상 수) */
    note?: string;
    highlight?: boolean;
}

export function BarChart({
    rows,
    unit = "",
    caption,
}: {
    rows: BarRow[];
    unit?: string;
    caption: string;
}) {
    const max = Math.max(...rows.map((r) => r.value), 1);

    return (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <table className="w-full text-left text-[13px]">
                <caption className="sr-only">{caption}</caption>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.label} className="border-b border-neutral-50 last:border-0">
                            <th
                                scope="row"
                                className="w-20 whitespace-nowrap px-4 py-2 text-[12px] font-medium text-neutral-600"
                            >
                                {r.label}
                            </th>
                            <td className="py-2 pr-2">
                                <div className="h-5 w-full rounded-full bg-neutral-100">
                                    <div
                                        className={`h-5 rounded-full ${
                                            r.highlight ? "bg-[#FF6B35]" : "bg-neutral-800"
                                        }`}
                                        style={{ width: `${Math.max((r.value / max) * 100, 2)}%` }}
                                    />
                                </div>
                            </td>
                            <td className="w-28 whitespace-nowrap px-4 py-2 text-right">
                                <span className="text-[13px] font-semibold tabular-nums text-[#1A1A1A]">
                                    {r.value.toLocaleString()}
                                    {unit}
                                </span>
                                {r.note && (
                                    <span className="block text-[11px] tabular-nums text-neutral-400">
                                        {r.note}
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
