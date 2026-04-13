import { ViralVideo } from "@/lib/viral-types";
import { DashboardClient } from "./DashboardClient";
import { RANKING_URL } from "@/lib/cdn";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let initialVideos: ViralVideo[] = [];
  let categories: string[] = [];
  let errorDetail: string | null = null;
  let updatedAt = "";

  try {
    const res = await fetch(RANKING_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`CDN fetch failed: ${res.status} ${res.statusText}`);

    const allVideos: ViralVideo[] = await res.json();

    initialVideos = [...allVideos]
      .sort((a, b) => (b.hourly_view_increase ?? 0) - (a.hourly_view_increase ?? 0))
      .slice(0, 20);

    // 전체 JSON에서 카테고리 동적 추출
    const catSet = new Set<string>();
    for (const v of allVideos) {
      if (v.category_name) catSet.add(v.category_name);
    }
    categories = Array.from(catSet).sort();

    // 업데이트 시각: '2026-03-31-09' 또는 'HH:MM' → 'X시'
    if (initialVideos.length > 0 && initialVideos[0].updated_at) {
      const raw = initialVideos[0].updated_at;
      const dashMatch = raw.match(/(\d{4}-\d{2}-\d{2})-(\d{1,2})$/);
      const colonMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
      if (dashMatch) updatedAt = `${parseInt(dashMatch[2], 10)}시`;
      else if (colonMatch) updatedAt = `${parseInt(colonMatch[1], 10)}시`;
      else updatedAt = raw;
    }
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
    <DashboardClient
      initialVideos={initialVideos}
      allVideos={[]}
      categories={categories}
      updatedAt={updatedAt}
    />
  );
}