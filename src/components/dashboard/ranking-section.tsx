"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ViralVideo } from "@/lib/viral-types";

// ─── Types ───────────────────────────────────────────────────────────────────

type SortKey = "hourly_views" | "hourly_likes" | "hourly_comments" | "total_views";
type VideoType = "all" | "shorts" | "longform";
type OriginType = "all" | "domestic" | "international";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천`;
  return n.toLocaleString();
}

function getMainMetric(video: ViralVideo, sortBy: SortKey) {
  switch (sortBy) {
    case "hourly_views":
      return { emoji: "🔥", label: "최근 1시간 조회수", value: `+${video.hourly_view_increase.toLocaleString()}회` };
    case "hourly_likes":
      return { emoji: "❤️", label: "최근 1시간 좋아요", value: `+${video.hourly_like_increase.toLocaleString()}` };
    case "hourly_comments":
      return { emoji: "💬", label: "최근 1시간 댓글", value: `+${video.hourly_comment_increase.toLocaleString()}` };
    case "total_views":
      return { emoji: "📈", label: "누적 조회수", value: formatCount(video.total_views) };
  }
}

// ─── Ranking Card ─────────────────────────────────────────────────────────────

function RankingCard({ video, rank, sortBy }: { video: ViralVideo; rank: number; sortBy: SortKey }) {
  const metric = getMainMetric(video, sortBy);
  const isShorts = video.video_type === "Shorts 📱";

  return (
    <Card className="group overflow-hidden border-neutral-100 bg-neutral-50/50 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
      {/* Video Type Placeholder */}
      <div className="relative aspect-video overflow-hidden bg-neutral-100 flex items-center justify-center">
        <span className="text-4xl">{isShorts ? "📱" : "📺"}</span>

        {/* Rank Badge */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/85 text-sm font-bold text-white shadow-lg backdrop-blur-sm">
            {rank}
          </div>
        </div>

        {/* Shorts indicator */}
        {isShorts && (
          <div className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            📱 Shorts
          </div>
        )}
      </div>

      <CardContent className="flex flex-col gap-2.5 p-4">
        {/* Channel */}
        <p className="text-[11px] font-medium text-muted-foreground">{video.channel_title}</p>

        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-heading">
          {video.title}
        </h3>

        {/* Main Metric */}
        <p className="font-serif text-base font-bold leading-tight text-red-600">
          {metric.emoji} {metric.label} <span className="text-lg">{metric.value}</span>
        </p>

        {/* Sub Metrics */}
        <p className="font-sans text-[11px] text-[#555555]">
          총 {formatCount(video.total_views)} 회 &nbsp;·&nbsp; 좋아요 {formatCount(video.total_likes)} &nbsp;·&nbsp; 댓글 {formatCount(video.total_comments)}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] font-medium">
            {video.category_name}
          </Badge>
          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] font-medium">
            {isShorts ? "Shorts 📱" : "Long-form 📺"}
          </Badge>
          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] font-medium">
            {video.origin_type === "DOMESTIC" ? "🇰🇷 국내" : "🌐 해외"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export function RankingSection({ videos }: { videos: ViralVideo[] }) {
  const [videoType, setVideoType] = useState<VideoType>("all");
  const [category, setCategory] = useState<string>("전체 카테고리");
  const [originType, setOriginType] = useState<OriginType>("all");
  const [sortBy, setSortBy] = useState<SortKey>("hourly_views");

  const categories = useMemo(() => {
    const cats = Array.from(new Set(videos.map((v) => v.category_name).filter(Boolean)));
    return ["전체 카테고리", ...cats];
  }, [videos]);

  const filtered = useMemo(() => {
    return videos
      .filter((v) => {
        if (videoType === "shorts" && v.video_type !== "Shorts 📱") return false;
        if (videoType === "longform" && v.video_type !== "Long-form 📺") return false;
        if (category !== "전체 카테고리" && v.category_name !== category) return false;
        if (originType === "domestic" && v.origin_type !== "DOMESTIC") return false;
        if (originType === "international" && v.origin_type !== "IMPORTED") return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "hourly_views": return b.hourly_view_increase - a.hourly_view_increase;
          case "hourly_likes": return b.hourly_like_increase - a.hourly_like_increase;
          case "hourly_comments": return b.hourly_comment_increase - a.hourly_comment_increase;
          case "total_views": return b.total_views - a.total_views;
        }
      });
  }, [videos, videoType, category, originType, sortBy]);

  return (
    <section className="mt-12 space-y-6">

      {/* Section Header */}
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-3xl font-bold text-heading">Top 100 실시간 랭킹</h2>
        <p className="text-sm text-muted-foreground">시간당 조회수 증가 기반 실시간 집계</p>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-border bg-card px-6 py-5 space-y-4">

        {/* Row 1: Video type + Category + Country */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Video Type */}
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            {([
              { value: "all", label: "전체" },
              { value: "shorts", label: "Shorts 📱" },
              { value: "longform", label: "Long-form 📺" },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setVideoType(value)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  videoType === value
                    ? "bg-black text-white"
                    : "text-muted-foreground hover:bg-neutral-100 hover:text-heading"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden h-5 w-px bg-border sm:block" />

          {/* Category */}
          <Select value={category} onValueChange={(v) => { if (v !== null) setCategory(v); }}>
            <SelectTrigger className="h-9 w-[160px] rounded-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Divider */}
          <div className="hidden h-5 w-px bg-border sm:block" />

          {/* Country */}
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            {([
              { value: "all", label: "전체" },
              { value: "domestic", label: "국내 트렌드 🇰🇷" },
              { value: "international", label: "해외 트렌드 🌐" },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setOriginType(value)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  originType === value
                    ? "bg-black text-white"
                    : "text-muted-foreground hover:bg-neutral-100 hover:text-heading"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Sort Tabs */}
        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <TabsList className="h-9 bg-neutral-100 p-1">
            <TabsTrigger value="hourly_views" className="rounded-full px-4 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">🔥 조회수 급상승</TabsTrigger>
            <TabsTrigger value="hourly_likes" className="rounded-full px-4 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">❤️ 좋아요 급상승</TabsTrigger>
            <TabsTrigger value="hourly_comments" className="rounded-full px-4 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">💬 댓글 급상승</TabsTrigger>
            <TabsTrigger value="total_views" className="rounded-full px-4 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">📈 누적 조회수</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-border bg-neutral-50/50 text-sm text-muted-foreground">
          선택한 필터에 해당하는 영상이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((video, i) => (
            <RankingCard key={video.video_id} video={video} rank={i + 1} sortBy={sortBy} />
          ))}
        </div>
      )}
    </section>
  );
}
