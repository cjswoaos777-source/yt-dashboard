import { unstable_cache } from "next/cache";
import { TierChannel } from "@/lib/tier-channel-types";
import { BenchmarkingDashboardClient } from "./BenchmarkingDashboardClient";
import { CHANNELS_URL, getCdnVersion } from "@/lib/cdn";
import { SITE } from "@/lib/site";
import type { Metadata } from "next";

// BenchmarkingDashboardClient가 useSearchParams를 쓰므로 정적 프리렌더 시 CSR bailout이
// 발생해 채널 데이터가 HTML에서 빠진다. 크롤러 노출을 위해 SSR을 유지한다.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "급성장 채널 벤치마킹",
    description:
        "최근 7일간 눈에 띄게 성장한 유튜브 채널을 분석합니다. 구독자 증가, 조회수 효율, 참여도 지표로 벤치마킹할 채널을 찾아보세요.",
    alternates: { canonical: "/dashboard/benchmarking" },
    openGraph: {
        title: "급성장 채널 벤치마킹 | Viral Hunter",
        description:
            "최근 7일간 눈에 띄게 성장한 유튜브 채널 분석. 매일 저녁 갱신됩니다.",
        url: `${SITE.url}/dashboard/benchmarking`,
        type: "website",
    },
};

// 1.4MB gz를 매 요청마다 받아 압축 해제·정렬하는 대신 가공 결과만 캐싱한다.
// 캐시 키에 version(ETag)을 넣어 원본이 실제로 바뀔 때만 다시 계산한다.
// 시간 기준 TTL 은 데이터가 그대로여도 주기마다 전부 다시 하면서 그 주기만큼
// 반영도 늦어지는 구조라 쓰지 않는다.
const getBenchmarkingSnapshot = (version: string) => unstable_cache(
    async (): Promise<{
        channels: TierChannel[];
        categories: string[];
        originTypes: string[];
        targetDate: string | null;
    }> => {
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
        const targetDate = dates[dates.length - 1] ?? null;

        // 최신 날짜 기준
        const latestAll = targetDate
            ? allChannels.filter((c) => c.target_date === targetDate)
            : allChannels;

        // 성장이 멈췄거나 역성장한 채널은 '급성장 벤치마킹' 목록에서 제외한다.
        // (2026-07-31 실측: 8,000개 중 909개가 일평균 증가 0 이하, 그중 71개는 음수.
        //  기본 화면 상위 60개에도 11개가 섞여 있었고, 16개 카테고리 중 15개가 같은 문제였다.)
        // 주의: 원본 JSON 에서 빼면 안 된다. 채널 상세 페이지(/channel/[id])가 같은 데이터를
        // 쓰므로, 제거하면 색인된 페이지 57개가 404 가 된다. 목록 표시에서만 걸러낸다.
        const latest = latestAll.filter((c) => (c.avg_daily_view_increase ?? 0) > 0);

        const channels = [...latest]
            .sort((a, b) => (b.damped_score ?? 0) - (a.damped_score ?? 0))
            .slice(0, 60);

        // 카테고리 & origin 동적 추출 — 필터된 목록 기준이어야 빈 결과가 나오지 않는다
        const catSet = new Set<string>();
        const originSet = new Set<string>();
        for (const ch of latest) {
            if (ch.main_category && ch.main_category !== "overall") catSet.add(ch.main_category);
            if (ch.origin_type) originSet.add(ch.origin_type);
        }

        return {
            channels,
            categories: Array.from(catSet).sort(),
            originTypes: Array.from(originSet).sort(),
            targetDate,
        };
    },
    // -v4 + version: 가공 로직이 바뀌면 접미사를 올려야 옛 결과가 남지 않는다.
    ["benchmarking-tier-channels-v4", version],
    { revalidate: 3600 }
)();

export default async function BenchmarkingPage() {
    let initialChannels: TierChannel[] = [];
    let categories: string[] = [];
    let originTypes: string[] = [];
    let targetDate: string | null = null;
    let errorDetail: string | null = null;

    try {
        const version = await getCdnVersion(CHANNELS_URL);
        const snapshot = await getBenchmarkingSnapshot(version);
        initialChannels = snapshot.channels;
        categories = snapshot.categories;
        originTypes = snapshot.originTypes;
        targetDate = snapshot.targetDate;
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
