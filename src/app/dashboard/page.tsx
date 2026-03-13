import { supabaseServer } from "@/lib/supabase";
import { ViralMainCard } from "@/components/dashboard/viral-main-card";
import { EfficientChannelsCard } from "@/components/dashboard/efficient-channels-card";
import { DurationChartCard } from "@/components/dashboard/duration-chart-card";
import { KeywordCard } from "@/components/dashboard/keyword-card";
import { EngagementCard } from "@/components/dashboard/engagement-card";
import { ViralVideo } from "@/lib/viral-types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = supabaseServer();
  let viralVideos: ViralVideo[] = [];
  let errorDetail = null;

  try {
    // 1. 떡상 데이터 가져오기 (요약 테이블 조회)
    const { data, error } = await supabase
      .from("dashboard_viral_metrics")
      .select("*")
      .order("viral_score", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Supabase Select Error:", error);
      errorDetail = `Supabase Error: ${error.message} (Code: ${error.code})`;
    } else {
      viralVideos = (data as ViralVideo[]) ?? [];
    }
  } catch (e: unknown) {
    console.error("Unexpected Error:", e);
    const message = e instanceof Error ? e.message : String(e);
    errorDetail = `Unexpected Error: ${message}`;
  }

  if (errorDetail) {
    return (
      <div className="min-h-screen bg-black text-red-500 flex items-center justify-center p-10">
        <div className="border border-red-800 bg-red-950/50 p-6 rounded-xl max-w-2xl">
          <h1 className="text-xl font-bold mb-4">데이터 로딩 실패</h1>
          <p className="font-mono text-sm whitespace-pre-wrap">{errorDetail}</p>
          <p className="mt-4 text-zinc-400 text-sm">
            팁: .env.local 파일이 올바른지 확인하고, 서버를 재시작해보세요.<br/>
            Supabase SQL Editor에서 dashboard_viral_metrics 테이블이 생성되었는지 확인하세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden bg-[#F5F5F4] text-stone-900 selection:bg-orange-100 selection:text-orange-900">
      
      <main className="mx-auto max-w-7xl px-6 py-12 md:px-8 lg:px-10">
        {/* Header */}
        <div className="mb-16 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md text-stone-900">
              <span className="text-xl">🔥</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-black md:text-5xl">
              유튜브 떡상 발굴기
            </h1>
          </div>
          <p className="max-w-2xl pl-[52px] text-lg font-medium text-gray-700">
            조회수 대비 반응이 폭발적인 영상을 실시간으로 포착합니다.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4 lg:grid-rows-2">
          
          {/* 1. Main Card (Top 5 Viral Videos) - 2x2 on Desktop */}
          <ViralMainCard videos={viralVideos} />

          {/* 2. Efficient Channels - 1x1 */}
          <EfficientChannelsCard videos={viralVideos} />

          {/* 3. Engagement Analysis - 1x1 */}
          <EngagementCard videos={viralVideos} />

          {/* 4. Duration Chart - 1x1 */}
          <DurationChartCard videos={viralVideos} />

          {/* 5. Keywords - 1x1 */}
          <KeywordCard videos={viralVideos} />
          
        </div>
      </main>
    </div>
  );
}