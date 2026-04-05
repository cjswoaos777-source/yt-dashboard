"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TierChannel } from "@/lib/tier-channel-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmtCompact(n: number): string {
    if (!n && n !== 0) return "-";
    const abs = Math.abs(n);
    if (abs >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
    if (abs >= 10_000) return `${(n / 10_000).toFixed(1)}만`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}천`;
    return n.toLocaleString();
}

const TIER_LABELS: Record<number, { label: string; color: string }> = {
    1: { label: "Tier 1", color: "#F59E0B" }, // amber
    2: { label: "Tier 2", color: "#94A3B8" }, // slate
    3: { label: "Tier 3", color: "#CD7C54" }, // bronze
};


// ─── Sort label helper ─────────────────────────────────────────────────────────

type SortKey = "avg_daily_view_increase" | "avg_daily_sub_increase" | "damped_score";

// ─── Channel Bento Card ───────────────────────────────────────────────────────

export function ChannelBentoCard({
    channel,
    rank,
    sortBy,
}: {
    channel: TierChannel;
    rank: number;
    sortBy: SortKey;
}) {
    const [imgError, setImgError] = useState(false);
    const tierMeta = TIER_LABELS[channel.tier] ?? { label: `Tier ${channel.tier}`, color: "#888" };

    return (
        <a
            href={`https://www.youtube.com/channel/${channel.channel_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
            {/* ── Thumbnail Zone ─────────────────────────────────────── */}
            <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
                {!imgError && channel.video_thumbnail ? (
                    <Image
                        src={channel.video_thumbnail}
                        alt={channel.channel_title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => setImgError(true)}
                        unoptimized
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl bg-gradient-to-br from-neutral-100 to-neutral-200">
                        📺
                    </div>
                )}

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent z-10" />

                {/* Rank badge — top left */}
                <div className="absolute left-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/80 text-xs font-bold text-white shadow backdrop-blur-sm">
                    {rank}
                </div>

                {/* NEW badge — top right */}
                {channel.is_new_channel && (
                    <div
                        className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm"
                        style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}
                    >
                        ✨ NEW
                    </div>
                )}

                {/* Tier badge — bottom left, on photo */}
                <div
                    className="absolute left-2.5 bottom-2.5 z-20 rounded-full px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm"
                    style={{ background: tierMeta.color + "CC" }}
                >
                    {tierMeta.label}
                </div>

                {/* Top video views — bottom right, on photo */}
                {channel.top_video_views > 0 && (
                    <div className="absolute right-2.5 bottom-2.5 z-20 flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                        <span>👁</span>
                        <span>{fmtCompact(channel.top_video_views)}</span>
                    </div>
                )}
            </div>

            {/* ── Body ───────────────────────────────────────────────── */}
            <div className="flex flex-1 flex-col p-4">
                {/* Channel title */}
                <h3
                    className="line-clamp-1 text-sm leading-snug text-neutral-900 mb-0.5"
                    style={{ fontWeight: 700, letterSpacing: "-0.02em" }}
                >
                    {channel.channel_title}
                </h3>

                {/* Subscriber + total view counts */}
                <p
                    className="text-[11px] text-neutral-400 mb-3"
                    style={{ fontWeight: 500 }}
                >
                    구독자 {fmtCompact(channel.subscriber_count)} &middot; 총 {fmtCompact(channel.total_view_count)}회
                </p>

                {/* ── Key Metrics ─────────────────────── */}
                <div className="flex flex-col gap-2 mb-3">
                    {/* Viral score — always shown, highlighted if sorted by it */}
                    <div
                        className={cn(
                            "flex items-center justify-between rounded-xl px-3 py-2",
                            sortBy === "damped_score"
                                ? "bg-orange-50 border border-orange-100"
                                : "bg-neutral-50"
                        )}
                    >
                        <span className="text-[11px] font-semibold text-neutral-500">🔥 바이럴 화력</span>
                        <span
                            className="text-[14px] font-bold"
                            style={{ color: sortBy === "damped_score" ? "#F97316" : "#374151" }}
                        >
                            {channel.damped_score.toFixed(1)}
                        </span>
                    </div>

                    {/* Daily view increase */}
                    <div
                        className={cn(
                            "flex items-center justify-between rounded-xl px-3 py-2",
                            sortBy === "avg_daily_view_increase"
                                ? "bg-emerald-50 border border-emerald-100"
                                : "bg-neutral-50"
                        )}
                    >
                        <span className="text-[11px] font-semibold text-neutral-500">📈 일평균 조회수↑</span>
                        <span
                            className="text-[13px] font-bold"
                            style={{ color: sortBy === "avg_daily_view_increase" ? "#10B981" : "#374151" }}
                        >
                            +{fmtCompact(channel.avg_daily_view_increase)}
                        </span>
                    </div>

                    {/* Daily sub increase */}
                    <div
                        className={cn(
                            "flex items-center justify-between rounded-xl px-3 py-2",
                            sortBy === "avg_daily_sub_increase"
                                ? "bg-violet-50 border border-violet-100"
                                : "bg-neutral-50"
                        )}
                    >
                        <span className="text-[11px] font-semibold text-neutral-500">👥 일평균 구독자↑</span>
                        <span
                            className="text-[13px] font-bold"
                            style={{ color: sortBy === "avg_daily_sub_increase" ? "#8B5CF6" : "#374151" }}
                        >
                            +{fmtCompact(channel.avg_daily_sub_increase)}
                        </span>
                    </div>
                </div>


                {/* ── Tags ─────────────────────────────── */}
                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    {channel.main_category && (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-medium text-neutral-500">
                            {channel.main_category}
                        </span>
                    )}
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-medium text-neutral-500">
                        {channel.league_group}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-medium text-neutral-500">
                        {channel.origin_type === "DOMESTIC" ? "🇰🇷 국내" : channel.origin_type === "IMPORTED" ? "🌐 해외" : `🌍 ${channel.origin_type}`}
                    </span>
                </div>
            </div>
        </a>
    );
}
