"use client";

import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViralVideo } from "@/lib/viral-types";

export function DurationChartCard({ videos }: { videos: ViralVideo[] }) {
  const data = React.useMemo(() => {
    // 0~60초 사이 쇼츠만 대상, 15초 단위 구간
    const buckets = { "0-15s": 0, "15-30s": 0, "30-45s": 0, "45-60s": 0 };
    const counts = { "0-15s": 0, "15-30s": 0, "30-45s": 0, "45-60s": 0 };

    videos.forEach((v) => {
      if (v.duration_sec > 60) return;
      
      let key = "";
      if (v.duration_sec <= 15) key = "0-15s";
      else if (v.duration_sec <= 30) key = "15-30s";
      else if (v.duration_sec <= 45) key = "30-45s";
      else key = "45-60s";

      // 점수(viral_score) 합산 -> 평균 구하기
      if (key) {
        buckets[key as keyof typeof buckets] += v.viral_score;
        counts[key as keyof typeof counts] += 1;
      }
    });

    return Object.keys(buckets).map((k) => ({
      name: k,
      score: counts[k as keyof typeof counts] > 0 
        ? buckets[k as keyof typeof counts] / counts[k as keyof typeof counts] 
        : 0,
    }));
  }, [videos]);

  return (
    <Card className="col-span-1 h-full min-h-[300px]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base text-black">추천 영상 길이</CardTitle>
            <p className="text-xs text-gray-700">Viral Score 기반 최적 구간</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: "#374151" }} 
              dy={10}
            />
            <YAxis hide />
            <Tooltip 
              cursor={{ fill: "rgba(0,0,0,0.02)", radius: 8 }}
              contentStyle={{ backgroundColor: "#ffffff", border: "none", fontSize: "12px", borderRadius: "12px", color: "#1c1917", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
            />
            <Bar dataKey="score" radius={[6, 6, 6, 6]} barSize={32}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === 1 ? "#818cf8" : "#f5f5f4"}
                  className="transition-all duration-300 hover:opacity-80"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-600">
          <div className="h-2 w-2 rounded-full bg-indigo-400"></div>
          <span>가장 효과적인 구간</span>
        </div>
      </CardContent>
    </Card>
  );
}
