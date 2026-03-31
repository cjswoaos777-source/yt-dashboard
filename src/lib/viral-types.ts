export interface ViralVideo {
  video_id: string;
  title: string;
  channel_title: string;

  // 실제 DB 컬럼: 'Shorts 📱' | 'Long-form 📺'
  video_type: string;
  origin_type: "DOMESTIC" | "IMPORTED";
  category_name: string;

  total_views: number;
  total_likes: number;
  total_comments: number;

  hourly_view_increase: number;
  hourly_like_increase: number;
  hourly_comment_increase: number;

  updated_at: string;
}
