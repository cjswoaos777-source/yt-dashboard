"use client";

import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViralVideo } from "@/lib/viral-types";

export function DurationChartCard({ videos }: { videos: ViralVideo[] }) {
  const data = React.useMemo(() => {
    const buckets: Record<string, number> = {};
    const counts: Record<string, number> = {};

    videos.forEach((v) => {
      const key = v.video_type || "기타";
      buckets[key] = (buckets[key] ?? 0) + v.hourly_view_increase;
      counts[key] = (counts[key] ?? 0) + 1;
    });

    return Object.keys(buckets).map((k) => ({
      name: k,
      score: counts[k] > 0 ? Math.round(buckets[k] / counts[k]) : 0,
    }));
  }, [videos]);

  const maxIdx = data.reduce((best, cur, i) => cur.score > data[best].score ? i : best, 0);

  return (
    <Card className="col-span-1 h-full min-h-[300px]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">포맷별 조회수 비교</CardTitle>
            <p className="text-xs text-muted-foreground">시간당 평균 조회수 증가량</p>
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
              tick={{ fontSize: 11, fill: "#888888" }}
              dy={10}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.02)", radius: 8 }}
              contentStyle={{ backgroundColor: "#ffffff", border: "none", fontSize: "12px", borderRadius: "12px", color: "#1A1A1A", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
            />
            <Bar dataKey="score" radius={[6, 6, 6, 6]} barSize={32}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === maxIdx ? "#1A1A1A" : "#E5E5E5"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-neutral-700"></div>
          <span>가장 높은 조회수 포맷</span>
        </div>
      </CardContent>
    </Card>
  );
}
