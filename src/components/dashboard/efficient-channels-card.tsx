"use client";

import * as React from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViralVideo } from "@/lib/viral-types";

export function EfficientChannelsCard({ videos }: { videos: ViralVideo[] }) {
  // 채널별로 집계: (총 조회수 / 구독자 수) 평균 계산
  const channelStats = React.useMemo(() => {
    const stats = new Map<string, { title: string; efficiency: number; count: number }>();

    videos.forEach((video) => {
      if (!video.subscriber_count || video.subscriber_count === 0) return;
      
      // 효율성 = 조회수 / 구독자수 (높을수록 "체급 대비 잘 나감")
      const efficiency = video.view_count / video.subscriber_count;
      
      if (!stats.has(video.channel_id)) {
        stats.set(video.channel_id, { title: video.channel_title, efficiency, count: 1 });
      } else {
        const curr = stats.get(video.channel_id)!;
        curr.efficiency += efficiency;
        curr.count += 1;
      }
    });

    return Array.from(stats.values())
      .map((s) => ({ ...s, avgEfficiency: s.efficiency / s.count }))
      .sort((a, b) => b.avgEfficiency - a.avgEfficiency)
      .slice(0, 5);
  }, [videos]);

  return (
    <Card className="col-span-1 row-span-2 h-full min-h-[300px]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-black">벤치마킹 채널</CardTitle>
            <p className="text-sm text-gray-700 font-medium">체급 대비 조회수 효율 Top 5</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {channelStats.map((channel, idx) => (
          <div key={idx} className="flex items-center justify-between group rounded-[16px] p-3 hover:bg-stone-50 transition-colors duration-200">
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 shadow-sm">
                {idx + 1}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-black group-hover:text-violet-700 transition-colors">
                  {channel.title}
                </span>
                <span className="text-[11px] text-gray-600 group-hover:text-gray-500">
                  {channel.count}개 영상 분석됨
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-bold text-violet-600 text-sm">
                {(channel.avgEfficiency * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Efficiency</span>
            </div>
          </div>
        ))}
        {channelStats.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-500 font-medium">
            분석할 데이터가 부족합니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
