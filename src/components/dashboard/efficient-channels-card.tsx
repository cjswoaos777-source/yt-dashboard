"use client";

import * as React from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViralVideo } from "@/lib/viral-types";

export function EfficientChannelsCard({ videos }: { videos: ViralVideo[] }) {
  const channelStats = React.useMemo(() => {
    const stats = new Map<string, { title: string; totalIncrease: number; count: number }>();

    videos.forEach((video) => {
      if (!stats.has(video.channel_title)) {
        stats.set(video.channel_title, { title: video.channel_title, totalIncrease: video.hourly_view_increase, count: 1 });
      } else {
        const curr = stats.get(video.channel_title)!;
        curr.totalIncrease += video.hourly_view_increase;
        curr.count += 1;
      }
    });

    return Array.from(stats.values())
      .map((s) => ({ ...s, avgIncrease: s.totalIncrease / s.count }))
      .sort((a, b) => b.avgIncrease - a.avgIncrease)
      .slice(0, 5);
  }, [videos]);

  return (
    <Card className="col-span-1 row-span-2 h-full min-h-[300px]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>급상승 채널</CardTitle>
            <p className="text-sm text-muted-foreground font-medium">시간당 조회수 증가 Top 5 채널</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {channelStats.map((channel, idx) => (
          <div key={idx} className="flex items-center justify-between group rounded-[16px] p-3 hover:bg-neutral-50 transition-colors duration-200">
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold text-muted-foreground group-hover:bg-black group-hover:text-white transition-all duration-300 shadow-sm">
                {idx + 1}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-heading transition-colors">
                  {channel.title}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {channel.count}개 영상 분석됨
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-serif font-bold text-heading text-sm">
                +{channel.avgIncrease.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">avg/hr</span>
            </div>
          </div>
        ))}
        {channelStats.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground font-medium">
            분석할 데이터가 부족합니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
