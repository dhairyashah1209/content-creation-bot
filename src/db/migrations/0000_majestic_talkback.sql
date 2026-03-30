CREATE TABLE "hashtag_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hashtag" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"post_count_24h" bigint,
	"post_count_7d" bigint,
	"avg_likes" numeric(12, 2),
	"avg_comments" numeric(10, 2),
	"top_post_ids" uuid[],
	"momentum_score" numeric(4, 3)
);
--> statement-breakpoint
CREATE TABLE "raw_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"source" text NOT NULL,
	"topic_id" uuid,
	"author_handle" text,
	"author_followers" bigint,
	"author_is_verified" boolean DEFAULT false NOT NULL,
	"caption" text,
	"media_type" text,
	"media_url" text,
	"post_url" text,
	"like_count" bigint DEFAULT 0 NOT NULL,
	"comment_count" bigint DEFAULT 0 NOT NULL,
	"share_count" bigint DEFAULT 0 NOT NULL,
	"save_count" bigint DEFAULT 0 NOT NULL,
	"play_count" bigint,
	"hashtags" text[] DEFAULT '{}' NOT NULL,
	"mentions" text[] DEFAULT '{}' NOT NULL,
	"posted_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_stale" boolean DEFAULT false NOT NULL,
	"raw_payload" jsonb,
	CONSTRAINT "raw_posts_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "tracked_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_type" text NOT NULL,
	"value" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"refresh_interval_minutes" integer DEFAULT 240 NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trend_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"snapshot_time" timestamp with time zone DEFAULT now() NOT NULL,
	"likes_at_snapshot" bigint,
	"comments_at_snapshot" bigint,
	"engagement_velocity_score" numeric(4, 3) NOT NULL,
	"reach_amplification_score" numeric(4, 3) NOT NULL,
	"hashtag_momentum_score" numeric(4, 3) NOT NULL,
	"recency_score" numeric(4, 3) NOT NULL,
	"format_multiplier" numeric(4, 3) NOT NULL,
	"trend_score" numeric(5, 3) NOT NULL,
	"trend_tier" text NOT NULL,
	"estimated_reach" bigint,
	"engagement_rate" numeric(6, 4),
	"velocity_delta" numeric(8, 3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "raw_posts" ADD CONSTRAINT "raw_posts_topic_id_tracked_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."tracked_topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_snapshots" ADD CONSTRAINT "trend_snapshots_post_id_raw_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."raw_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_hashtag_stats_tag" ON "hashtag_stats" USING btree ("hashtag");--> statement-breakpoint
CREATE INDEX "idx_raw_posts_posted_at" ON "raw_posts" USING btree ("posted_at");--> statement-breakpoint
CREATE INDEX "idx_raw_posts_topic_id" ON "raw_posts" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "idx_raw_posts_is_stale" ON "raw_posts" USING btree ("is_stale");--> statement-breakpoint
CREATE INDEX "idx_trend_snapshots_score" ON "trend_snapshots" USING btree ("trend_score");--> statement-breakpoint
CREATE INDEX "idx_trend_snapshots_time" ON "trend_snapshots" USING btree ("snapshot_time");--> statement-breakpoint
CREATE INDEX "idx_trend_snapshots_post_id" ON "trend_snapshots" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_trend_snapshots_tier" ON "trend_snapshots" USING btree ("trend_tier");