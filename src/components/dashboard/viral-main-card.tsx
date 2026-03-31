"use client";

import * as React from "react";
import { Flame, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViralVideo } from "@/lib/viral-types";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export function ViralMainCard({ videos }: { videos: ViralVideo[] }) {
  const topVideos = videos.slice(0, 5);

  const chartData = React.useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      time: i,
      value: 50 + Math.random() * 50 + (i * 2),
    }));
  }, []);

  return (
    <Card className="col-span-2 row-span-2 h-full min-h-[400px] overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
            <Flame className="h-5 w-5 fill-current" />
          </div>
          <div>
            <CardTitle>실시간 떡상 랭킹</CardTitle>
            <p className="text-sm text-muted-foreground font-medium">지금 반응이 터지고 있는 영상들</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid h-full grid-cols-1 gap-6 pb-6 lg:grid-cols-2">
        {/* Left Column: List */}
        <div className="flex flex-col gap-3 overflow-y-auto pr-2 scrollbar-hide">
          {topVideos.map((video, idx) => (
            <div
              key={video.video_id}
              className="group relative flex gap-4 overflow-hidden rounded-[20px] bg-neutral-50 p-3 transition-all duration-300 hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-transparent hover:border-border"
            >
              {/* Rank Badge */}
              <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-br-[16px] bg-white text-xs font-bold text-muted-foreground shadow-sm group-hover:bg-black group-hover:text-white transition-colors duration-300">
                {idx + 1}
              </div>

              {/* Video Type Placeholder */}
              <div className="relative flex-none flex items-center justify-center w-32 aspect-video rounded-2xl bg-neutral-100 shadow-sm overflow-hidden">
                <span className="text-2xl">{video.video_type === "쇼츠" ? "📱" : "📺"}</span>
                <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  {video.video_type}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 backdrop-blur-[1px]">
                  <span className="text-white text-xl drop-shadow-md">▶</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                <div className="space-y-1">
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug text-heading transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium truncate">{video.channel_title}</p>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
                  <div className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-heading">
                    <TrendingUp className="h-2.5 w-2.5" />
                    <span className="font-bold">
                      +{video.hourly_view_increase.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{(video.total_views / 10000).toFixed(1)}만 views</span>
                    <span className="h-0.5 w-0.5 rounded-full bg-border"></span>
                    <span>{video.origin_type}</span>
                  </div>
                </div>
              </div>

              <a
                 href={`https://www.youtube.com/watch?v=${video.video_id}`}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="absolute inset-0 z-10"
              />
            </div>
          ))}
        </div>
        {/* Right Column: Sparkline Chart */}
        <div className="relative hidden h-full flex-col justify-between rounded-[24px] bg-neutral-50 p-6 lg:flex">
          <div className="mb-4">
             <h4 className="text-sm font-bold text-heading">실시간 트렌드 추이</h4>
             <p className="text-xs text-muted-foreground">최근 24시간 바이럴 스코어 변동</p>
          </div>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A1A1A" stopOpacity={0.12}/>
                  <stop offset="95%" stopColor="#1A1A1A" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "none", borderRadius: "12px", color: "#1A1A1A", fontSize: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                itemStyle={{ color: "#1A1A1A" }}
                cursor={{ stroke: "#EAEAEE", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#1A1A1A"
                strokeWidth={2}
                fill="url(#colorValue)"
                dot={false}
                activeDot={{ r: 5, fill: "#1A1A1A", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
