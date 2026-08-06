import { unstable_cache } from "next/cache";
import { RANKING_TIER_URLS, getCdnVersion, type TierKey } from "@/lib/cdn";
import type { ViralVideo } from "@/lib/viral-types";

/**
 * 구독자 구간별 페이지.
 *
 * 대시보드에도 같은 필터가 있지만 쿼리스트링(?tier=micro)이라 색인되지 않는다.
 * 구간마다 고유 URL 을 주어 "구독자 1만 미만 급상승" 같은 검색어에 대응한다.
 *
 * 파이프라인이 이미 구간별 파일을 따로 내보내고 있어 추가 작업이 필요 없다.
 */

/** URL 에 쓰는 구간 이름. sub_tier 값과 1:1 대응한다. */
export const TIER_LEVELS = ["tier1", "tier2", "tier3", "micro"] as const;
export type TierLevel = (typeof TIER_LEVELS)[number];

export const TIER_META: Record<
    TierLevel,
    { label: string; range: string; description: string }
> = {
    tier1: {
        label: "대형 채널",
        range: "구독자 100만 명 이상",
        description:
            "이미 자리 잡은 채널들이 지금 어떤 영상으로 조회수를 올리고 있는지 봅니다.",
    },
    tier2: {
        label: "중견 채널",
        range: "구독자 10만 ~ 100만 명",
        description:
            "성장 궤도에 오른 채널 구간입니다. 벤치마킹 대상으로 가장 참고할 만합니다.",
    },
    tier3: {
        label: "성장 채널",
        range: "구독자 1만 ~ 10만 명",
        description:
            "본격적으로 터지기 시작하는 구간입니다. 지금 무엇이 먹히는지 가장 빠르게 드러납니다.",
    },
    micro: {
        label: "마이크로 채널",
        range: "구독자 1만 명 미만",
        description:
            "구독자가 적은데도 조회수가 폭발한 영상들입니다. 구독자 수에 가려 잘 보이지 않던 진짜 떡상을 찾습니다.",
    },
};

export function isTierLevel(v: string): v is TierLevel {
    return (TIER_LEVELS as readonly string[]).includes(v);
}

/** 페이지에 실을 영상 수 */
const DISPLAY_LIMIT = 50;

async function fetchTierVideos(level: TierLevel): Promise<ViralVideo[]> {
    const res = await fetch(RANKING_TIER_URLS[level as TierKey], { cache: "no-store" });
    if (!res.ok) throw new Error(`CDN fetch failed: ${res.status} ${res.statusText}`);

    const contentType = res.headers.get("content-type") ?? "";
    let raw: unknown;
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
    return Array.isArray(raw) ? (raw as ViralVideo[]) : [];
}

export interface TierSnapshot {
    videos: ViralVideo[];
    /** 해당 구간의 국내 영상 총 건수 (표시된 50개가 아니라 전체) */
    totalDomestic: number;
    totalHourlyIncrease: number;
    categories: string[];
    updatedAt: string;
}

/**
 * 구간별 스냅샷. 대시보드와 같은 이유로 국내만 대상으로 한다.
 * 캐시 키에 version(ETag)을 넣어 원본이 바뀔 때만 다시 계산한다.
 */
const getTierSnapshotCached = (version: string, level: TierLevel) => unstable_cache(
    async (): Promise<TierSnapshot> => {
        const all = await fetchTierVideos(level);
        const domestic = all.filter((v) => v.origin_type === "DOMESTIC");
        const sorted = [...domestic].sort(
            (a, b) => (b.hourly_view_increase ?? 0) - (a.hourly_view_increase ?? 0),
        );

        const catSet = new Set<string>();
        for (const v of domestic) if (v.category_name) catSet.add(v.category_name);

        const first = sorted[0];
        let updatedAt = "";
        if (first?.updated_at) {
            const m = first.updated_at.match(/(\d{4}-\d{2}-\d{2})-(\d{1,2})$/);
            updatedAt = m ? `${parseInt(m[2], 10)}시` : first.updated_at;
        }

        return {
            videos: sorted.slice(0, DISPLAY_LIMIT),
            totalDomestic: domestic.length,
            totalHourlyIncrease: domestic.reduce(
                (s, v) => s + (v.hourly_view_increase ?? 0),
                0,
            ),
            categories: Array.from(catSet).sort(),
            updatedAt,
        };
    },
    ["tier-snapshot-v1", version, level],
    { revalidate: 3600 },
)();

export async function getTierSnapshot(level: TierLevel): Promise<TierSnapshot | null> {
    try {
        const version = await getCdnVersion(RANKING_TIER_URLS[level as TierKey]);
        return await getTierSnapshotCached(version, level);
    } catch {
        return null;
    }
}
