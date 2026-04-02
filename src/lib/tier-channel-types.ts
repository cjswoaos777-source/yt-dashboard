export interface TierChannel {
    target_date: string;
    tier: number; // 1 | 2 | 3
    league_group: string; // 'SHORTS' | 'LONG' | 'HYBRID'
    damped_score: number;
    channel_id: string;
    channel_title: string;
    origin_type: string;
    main_category: string;
    is_new_channel: boolean;
    video_thumbnail: string;
    subscriber_count: number;
    total_view_count: number;
    avg_daily_view_increase: number;
    avg_daily_sub_increase: number;
    top_video_views: number;
}
