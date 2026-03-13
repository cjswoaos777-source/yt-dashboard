"use client";

import * as React from "react";
import { Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViralVideo } from "@/lib/viral-types";
import { cn } from "@/lib/utils";

export function KeywordCard({ videos }: { videos: ViralVideo[] }) {
  const keywords = React.useMemo(() => {
    const wordCounts: Record<string, number> = {};
    const ignoreList = ["the", "a", "of", "in", "to", "and", "shorts", "video", "vs", "with", "is", "for"];

    videos.slice(0, 30).forEach((v) => {
      // 제목에서 단어 추출 (영어, 한글 등)
      const words = v.title.toLowerCase().match(/([a-z0-9]+|[가-힣]+)/g) || [];
      words.forEach((w) => {
        if (w.length < 2 || ignoreList.includes(w)) return;
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      });
    });

    return Object.entries(wordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([word, count]) => ({ word, count }));
  }, [videos]);

  return (
    <Card className="col-span-1 h-full min-h-[200px]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <Hash className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base text-black">치트키 키워드</CardTitle>
            <p className="text-xs text-gray-700">떡상 영상 공통 키워드</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {keywords.map(({ word, count }, idx) => (
            <span
              key={word}
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300",
                idx < 3 
                  ? "bg-rose-50 text-rose-600 shadow-sm hover:bg-rose-100"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
              )}
            >
              #{word}
              {count > 1 && <span className="ml-1.5 opacity-50 text-[10px]">({count})</span>}
            </span>
          ))}
          {keywords.length === 0 && (
            <p className="text-xs text-gray-500">데이터가 부족합니다.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
