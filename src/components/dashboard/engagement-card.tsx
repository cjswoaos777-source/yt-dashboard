"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViralVideo } from "@/lib/viral-types";

export function EngagementCard({ videos }: { videos: ViralVideo[] }) {
  const avgLikeRatio = React.useMemo(() => {
    if (!videos.length) return 0;
    const totalRatio = videos.reduce((acc, v) => {
      return acc + (v.total_views > 0 ? (v.total_likes / v.total_views) : 0);
    }, 0);
    return (totalRatio / videos.length) * 100;
  }, [videos]);

  return (
    <Card className="col-span-1 h-full min-h-[150px]">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
            <Heart className="h-5 w-5 fill-current" />
          </div>
          <div>
            <CardTitle className="text-base">평균 좋아요 비율</CardTitle>
            <p className="text-xs text-muted-foreground">시청자 참여도 분석</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-4xl font-serif font-bold text-heading tracking-tight">
            {avgLikeRatio.toFixed(1)}%
          </span>
          <span className="text-xs font-medium text-muted-foreground">vs avg +2.4%</span>
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-black transition-all duration-700"
            style={{ width: `${Math.min(avgLikeRatio * 10, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          일반 영상 대비 높은 참여율을 보입니다.
        </p>
      </CardContent>
    </Card>
  );
}
