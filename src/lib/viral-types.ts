
export interface ViralVideo {
  video_id: string;
  title: string;
  channel_id: string;
  channel_title: string;
  thumbnail_url: string | null;
  // DB 컬럼명 변경 반영: views -> view_count, likes -> like_count, comments -> comment_count
  view_count: number;
  like_count: number;
  comment_count: number;
  duration_sec: number;
  subscriber_count: number;
  published_at: string;
  viral_score: number;
  rank_change?: number; // 순위 변동 (선택적)
}
