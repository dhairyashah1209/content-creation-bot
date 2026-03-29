export type TrendTier = "viral" | "rising" | "steady" | "declining" | "dormant";
export type MediaType = "image" | "video" | "carousel" | "reel" | "story";
export type TopicType = "hashtag" | "keyword";

export interface TrackedTopic {
  id: string;
  workspaceId: string | null;
  topicType: TopicType;
  value: string;
  isActive: boolean;
  refreshIntervalMinutes: number;
  lastFetchedAt: Date | null;
  createdAt: Date;
}

export interface RawPost {
  id: string;
  externalId: string;
  source: "apify" | "rapidapi";
  topicId: string | null;
  authorHandle: string | null;
  authorFollowers: number | null;
  authorIsVerified: boolean;
  caption: string | null;
  mediaType: MediaType | null;
  mediaUrl: string | null;
  postUrl: string | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  playCount: number | null;
  hashtags: string[];
  mentions: string[];
  postedAt: Date;
  fetchedAt: Date;
}

export interface TrendSnapshot {
  id: string;
  postId: string;
  snapshotTime: Date;
  likesAtSnapshot: number | null;
  commentsAtSnapshot: number | null;
  engagementVelocityScore: number;
  reachAmplificationScore: number;
  hashtagMomentumScore: number;
  recencyScore: number;
  formatMultiplier: number;
  trendScore: number;
  trendTier: TrendTier;
  estimatedReach: number | null;
  engagementRate: number | null;
  velocityDelta: number | null;
}

export interface HashtagStat {
  id: string;
  hashtag: string;
  recordedAt: Date;
  postCount24h: number | null;
  postCount7d: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  momentumScore: number | null;
}

export interface TrendFeedItem extends RawPost {
  snapshot: TrendSnapshot;
}

export interface ScoreBreakdown {
  engagementVelocity: number;
  reachAmplification: number;
  hashtagMomentum: number;
  recency: number;
  formatMultiplier: number;
  composite: number;
  tier: TrendTier;
}
