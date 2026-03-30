import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  bigint,
  numeric,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// ── Tracked Topics ──────────────────────────────────────────────────────────
export const trackedTopics = pgTable("tracked_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  topicType: text("topic_type").notNull().$type<"hashtag" | "keyword">(),
  value: text("value").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  refreshIntervalMinutes: integer("refresh_interval_minutes").default(240).notNull(),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Raw Posts ────────────────────────────────────────────────────────────────
export const rawPosts = pgTable(
  "raw_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalId: text("external_id").unique().notNull(),
    source: text("source").notNull().$type<"apify" | "rapidapi">(),
    topicId: uuid("topic_id").references(() => trackedTopics.id, { onDelete: "set null" }),
    authorHandle: text("author_handle"),
    authorFollowers: bigint("author_followers", { mode: "number" }),
    authorIsVerified: boolean("author_is_verified").default(false).notNull(),
    caption: text("caption"),
    mediaType: text("media_type").$type<"image" | "video" | "carousel" | "reel" | "story">(),
    mediaUrl: text("media_url"),
    postUrl: text("post_url"),
    likeCount: bigint("like_count", { mode: "number" }).default(0).notNull(),
    commentCount: bigint("comment_count", { mode: "number" }).default(0).notNull(),
    shareCount: bigint("share_count", { mode: "number" }).default(0).notNull(),
    saveCount: bigint("save_count", { mode: "number" }).default(0).notNull(),
    playCount: bigint("play_count", { mode: "number" }),
    hashtags: text("hashtags").array().default([]).notNull(),
    mentions: text("mentions").array().default([]).notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    // Marked true when likeCount < STALE_LIKE_THRESHOLD — excluded from refreshes and dashboard
    isStale: boolean("is_stale").default(false).notNull(),
    rawPayload: jsonb("raw_payload"),
  },
  (t) => [
    index("idx_raw_posts_posted_at").on(t.postedAt),
    index("idx_raw_posts_topic_id").on(t.topicId),
    index("idx_raw_posts_is_stale").on(t.isStale),
  ]
);

// ── Trend Snapshots ──────────────────────────────────────────────────────────
export const trendSnapshots = pgTable(
  "trend_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => rawPosts.id, { onDelete: "cascade" }),
    snapshotTime: timestamp("snapshot_time", { withTimezone: true }).defaultNow().notNull(),

    likesAtSnapshot: bigint("likes_at_snapshot", { mode: "number" }),
    commentsAtSnapshot: bigint("comments_at_snapshot", { mode: "number" }),

    engagementVelocityScore: numeric("engagement_velocity_score", { precision: 4, scale: 3 }).notNull(),
    reachAmplificationScore: numeric("reach_amplification_score", { precision: 4, scale: 3 }).notNull(),
    hashtagMomentumScore: numeric("hashtag_momentum_score", { precision: 4, scale: 3 }).notNull(),
    recencyScore: numeric("recency_score", { precision: 4, scale: 3 }).notNull(),
    formatMultiplier: numeric("format_multiplier", { precision: 4, scale: 3 }).notNull(),

    trendScore: numeric("trend_score", { precision: 5, scale: 3 }).notNull(),
    trendTier: text("trend_tier")
      .notNull()
      .$type<"viral" | "rising" | "steady" | "declining" | "dormant">(),

    estimatedReach: bigint("estimated_reach", { mode: "number" }),
    engagementRate: numeric("engagement_rate", { precision: 6, scale: 4 }),
    velocityDelta: numeric("velocity_delta", { precision: 8, scale: 3 }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_trend_snapshots_score").on(t.trendScore),
    index("idx_trend_snapshots_time").on(t.snapshotTime),
    index("idx_trend_snapshots_post_id").on(t.postId),
    index("idx_trend_snapshots_tier").on(t.trendTier),
  ]
);

// ── Hashtag Stats ────────────────────────────────────────────────────────────
export const hashtagStats = pgTable(
  "hashtag_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hashtag: text("hashtag").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
    postCount24h: bigint("post_count_24h", { mode: "number" }),
    postCount7d: bigint("post_count_7d", { mode: "number" }),
    avgLikes: numeric("avg_likes", { precision: 12, scale: 2 }),
    avgComments: numeric("avg_comments", { precision: 10, scale: 2 }),
    topPostIds: uuid("top_post_ids").array(),
    momentumScore: numeric("momentum_score", { precision: 4, scale: 3 }),
  },
  (t) => [index("idx_hashtag_stats_tag").on(t.hashtag)]
);

export type TrackedTopicInsert = typeof trackedTopics.$inferInsert;
export type RawPostInsert = typeof rawPosts.$inferInsert;
export type TrendSnapshotInsert = typeof trendSnapshots.$inferInsert;
export type HashtagStatInsert = typeof hashtagStats.$inferInsert;
