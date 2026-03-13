"use client";

import * as React from "react";
import { Play, Flame, TrendingUp } from "lucide-react";
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

  // 차트용 데이터 생성 (실시간 트렌드 시각화용 가상 데이터)
  // 실제로는 DB의 시계열 데이터를 사용해야 함
  const chartData = React.useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      time: i,
      value: 50 + Math.random() * 50 + (i * 2), // 우상향 트렌드 시뮬레이션
    }));
  }, []);

  return (
    <Card className="col-span-2 row-span-2 h-full min-h-[400px] overflow-hidden bg-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600">
            <Flame className="h-5 w-5 fill-current" />
          </div>
          <div>
            <CardTitle className="text-black">실시간 떡상 랭킹</CardTitle>
            <p className="text-sm text-gray-700 font-medium">지금 반응이 터지고 있는 영상들</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid h-full grid-cols-1 gap-6 pb-6 lg:grid-cols-2">
        {/* Left Column: List */}
        <div className="flex flex-col gap-3 overflow-y-auto pr-2 scrollbar-hide">
          {topVideos.map((video, idx) => (
            <div
              key={video.video_id}
              className="group relative flex gap-4 overflow-hidden rounded-[20px] bg-stone-50 p-3 transition-all duration-300 hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-transparent hover:border-stone-100"
            >
              {/* Rank Badge */}
              <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-br-[16px] bg-white text-xs font-bold text-gray-500 shadow-sm group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                {idx + 1}
              </div>

              {/* Thumbnail */}
              <div className="relative aspect-video w-32 flex-none overflow-hidden rounded-2xl shadow-sm bg-stone-200">
                <img
                  src={video.thumbnail_url || ""}
                  alt={video.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 backdrop-blur-[1px]">
                  <Play className="h-6 w-6 fill-white text-white drop-shadow-md" />
                </div>
              </div>

              {/* Info */}
              <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                <div className="space-y-1">
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug text-black group-hover:text-orange-700 transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-xs text-gray-600 font-medium truncate">{video.channel_title}</p>
                </div>
                
                <div className="flex items-center gap-3 text-[10px] font-medium text-gray-600">
                  <div className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-orange-600">
                    <span className="font-bold">
                      {Math.round(video.viral_score).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{(video.view_count / 1000).toFixed(1)}K views</span>
                    <span className="h-0.5 w-0.5 rounded-full bg-stone-300"></span>
                    <span>
                      {new Date(video.published_at).toLocaleDateString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                      })}
                    </span>
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
        <div className="relative hidden h-full flex-col justify-between rounded-[24px] bg-stone-50 p-6 lg:flex">
          <div className="mb-4">
             <h4 className="text-sm font-bold text-black">실시간 트렌드 추이</h4>
             <p className="text-xs text-gray-700">최근 24시간 바이럴 스코어 변동</p>
          </div>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ backgroundColor: "#fff", border: "none", borderRadius: "12px", color: "#1c1917", fontSize: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                itemStyle={{ color: "#ea580c" }}
                cursor={{ stroke: "#fed7aa", strokeWidth: 1 }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#f97316" 
                strokeWidth={3}
                fill="url(#colorValue)"
                dot={false}
                activeDot={{ r: 6, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
