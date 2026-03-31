export interface SparklinePoint {
    date: string;
    total_views: number;
    view_increase: number;
    sub_increase: number;
    video_increase: number;
    total_videos: number;
    total_subscribers: number;
}

export interface TierChannel {
    id: number;
    target_date: string;
    tier: number; // 1 | 2 | 3
    league_group: string; // 'SHORTS' | 'LONG' | 'HYBRID'
    damped_score: number;
    channel_id: string;
    channel_title: string;
    origin_type: string;
    main_category: string;
    country_code: string;
    is_new_channel: boolean;
    total_view_count: number;
    video_count: number;
    subscriber_count: number;
    representative_video_id: string;
    video_thumbnail: string;
    top_video_views: number;
    sparkline_data: SparklinePoint[] | null;
    avg_daily_view_increase: number;
    avg_daily_sub_increase: number;
}
