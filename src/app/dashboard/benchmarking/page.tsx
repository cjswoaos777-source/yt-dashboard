import { TierChannel } from "@/lib/tier-channel-types";
import { BenchmarkingDashboardClient } from "./BenchmarkingDashboardClient";
import { CHANNELS_URL } from "@/lib/cdn";

export const dynamic = "force-dynamic";

export default async function BenchmarkingPage() {
    let initialChannels: TierChannel[] = [];
    let categories: string[] = [];
    let originTypes: string[] = [];
    let targetDate: string | null = null;
    let errorDetail: string | null = null;

    try {
        const res = await fetch(CHANNELS_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`CDN fetch failed: ${res.status} ${res.statusText}`);

        // jsDelivr가 Content-Encoding:gzip 자동 적용 → 이미 decode된 경우 .json() 직접 사용
        // Content-Type이 application/gzip인 경우 수동 디코딩
        let raw: unknown;
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("gzip") || contentType.includes("octet-stream")) {
            const { promisify } = await import("util");
            const { gunzip } = await import("zlib");
            const gunzipAsync = promisify(gunzip);
            const buf = Buffer.from(await res.arrayBuffer());
            const decompressed = await gunzipAsync(buf);
            raw = JSON.parse(decompressed.toString("utf-8"));
        } else {
            raw = await res.json();
        }

        // 배열이 아닌 경우 방어 처리
        const allChannels: TierChannel[] = Array.isArray(raw) ? raw : [];

        // 최신 target_date 추출
        const dates = allChannels.map((c) => c.target_date).filter(Boolean).sort();
        targetDate = dates[dates.length - 1] ?? null;

        // 최신 날짜 기준 TOP 60 (damped_score DESC)
        const latest = targetDate
            ? allChannels.filter((c) => c.target_date === targetDate)
            : allChannels;

        initialChannels = [...latest]
            .sort((a, b) => (b.damped_score ?? 0) - (a.damped_score ?? 0))
            .slice(0, 60);

        // 카테고리 & origin 동적 추출 (전체 기준)
        const catSet = new Set<string>();
        const originSet = new Set<string>();
        for (const ch of latest) {
            if (ch.main_category && ch.main_category !== "overall") catSet.add(ch.main_category);
            if (ch.origin_type) originSet.add(ch.origin_type);
        }
        categories = Array.from(catSet).sort();
        originTypes = Array.from(originSet).sort();

    } catch (e: unknown) {
        errorDetail = `CDN 로딩 실패: ${e instanceof Error ? e.message : String(e)}`;
    }

    if (errorDetail) {
        return (
            <div className="min-h-screen bg-[#FDFDFC] flex items-center justify-center p-10">
                <div className="border border-red-200 bg-red-50 p-6 rounded-2xl max-w-2xl w-full">
                    <h1 className="text-lg font-bold text-red-700 mb-3">데이터 로딩 실패</h1>
                    <p className="font-mono text-sm text-red-600 whitespace-pre-wrap">{errorDetail}</p>
                    <p className="mt-4 text-sm text-neutral-500">
                        CDN URL을 확인하거나 잠시 후 다시 시도해보세요.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <BenchmarkingDashboardClient
            initialChannels={initialChannels}
            categories={categories}
            originTypes={originTypes}
            targetDate={targetDate}
        />
    );
}
