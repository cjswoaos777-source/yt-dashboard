export type SortBy = "views" | "likes" | "comments";

export type RegionCode = "KR" | "US" | "JP" | "IN" | "BR" | "ALL";

export type VideoLeaderboardRow = {
  video_id: string;
  title: string;
  channel_id: string;
  channel_title: string;
  thumbnail_url: string | null;
  views: number;
  likes: number;
  comments: number;
  rank: number;
  prev_rank: number | null;
};

export type ChannelLeaderboardRow = {
  channel_id: string;
  channel_title: string;
  avatar_url: string | null;
  total_views: number;
  videos_count: number;
  rank: number;
  prev_rank: number | null;
};
