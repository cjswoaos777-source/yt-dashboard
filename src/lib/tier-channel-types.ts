/** sparkline_data 배열의 한 항목 — 채널의 하루치 스냅샷 */
export interface SparklinePoint {
    date: string;
    sub_increase: number;
    view_increase: number;
    video_increase: number;
    total_subscribers: number;
    total_views: number;
    total_videos: number;
}

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

    // ─── CDN JSON 에는 있으나 기존 타입에 누락돼 있던 필드들 ───
    video_count?: number;
    country_code?: string;
    representative_video_id?: string;
    /**
     * 최근 수일간의 일별 추이(중위 4일, 최대 7일).
     * 파이프라인이 배열로 직렬화하지만, 과거 데이터는 파이썬 표기 문자열로
     * 저장돼 있어 JSON.parse 가 실패한다. parseSparkline() 로 정규화해서 쓴다.
     */
    sparkline_data?: SparklinePoint[] | string | null;
}
