import { ViralVideo } from "@/lib/viral-types";
import { DashboardClient } from "./DashboardClient";
import { RANKING_TIER_URLS } from "@/lib/cdn";
import { getLatestNotice } from "@/lib/notices";
import { SITE } from "@/lib/site";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "실시간 떡상 영상 TOP 20",
  description:
    "지금 이 순간 조회수가 폭발적으로 오르고 있는 유튜브 영상 TOP 20. 숏츠/롱폼, 국내/해외, 구독자 구간별 필터로 진짜 떡상 영상을 찾아보세요.",
  alternates: { canonical: "/dashboard" },
  openGraph: {
    title: "실시간 떡상 영상 TOP 20 | Viral Hunter",
    description:
      "지금 이 순간 조회수가 폭발적으로 오르고 있는 유튜브 영상 TOP 20. 매시간 자동 갱신됩니다.",
    url: `${SITE.url}/dashboard`,
    type: "website",
  },
};

export default async function DashboardPage() {
  let initialVideos: ViralVideo[] = [];
  let categories: string[] = [];
  let updatedAt = "";

  try {
    const res = await fetch(RANKING_TIER_URLS.all, { cache: "no-store" });
    if (!res.ok) throw new Error(`CDN fetch failed: ${res.status} ${res.statusText}`);

    // gzip 해제 (Node.js 서버 환경)
    const { promisify } = await import("util");
    const { gunzip } = await import("zlib");
    const gunzipAsync = promisify(gunzip);
    const buf = Buffer.from(await res.arrayBuffer());
    const decompressed = await gunzipAsync(buf);
    const allVideos: ViralVideo[] = JSON.parse(decompressed.toString("utf-8"));

    initialVideos = [...allVideos]
      .sort((a, b) => (b.hourly_view_increase ?? 0) - (a.hourly_view_increase ?? 0))
      .slice(0, 20);

    const catSet = new Set<string>();
    for (const v of allVideos) {
      if (v.category_name) catSet.add(v.category_name);
    }
    categories = Array.from(catSet).sort();

    if (initialVideos.length > 0 && initialVideos[0].updated_at) {
      const raw = initialVideos[0].updated_at;
      const dashMatch = raw.match(/(\d{4}-\d{2}-\d{2})-(\d{1,2})$/);
      const colonMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
      if (dashMatch) updatedAt = `${parseInt(dashMatch[2], 10)}시`;
      else if (colonMatch) updatedAt = `${parseInt(colonMatch[1], 10)}시`;
      else updatedAt = raw;
    }
  } catch {
    // SSR 실패시 빈 상태로 렌더 → 클라이언트가 마운트 후 재요청
  }

  const latestNotice = getLatestNotice();

  return (
    <DashboardClient
      initialVideos={initialVideos}
      allVideos={[]}
      categories={categories}
      updatedAt={updatedAt}
      latestNotice={latestNotice}
    />
  );
}
