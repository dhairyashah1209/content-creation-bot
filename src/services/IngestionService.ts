import { db } from "@/db/client";
import { rawPosts, trackedTopics } from "@/db/schema";
import { ApifyService } from "./ApifyService";
import { eq, and, gte, lt, isNotNull, sql } from "drizzle-orm";

// Posts with fewer than this many likes are low-virality — marked stale, excluded from refreshes
const STALE_LIKE_THRESHOLD = 10;

export class IngestionService {
  private apify: ApifyService;

  constructor() {
    this.apify = new ApifyService();
  }

  async runForAllActiveTopics(): Promise<{
    topicId: string;
    inserted: number;
    updated: number;
    skipped: number;
    error?: string;
  }[]> {
    const topics = await db
      .select()
      .from(trackedTopics)
      .where(eq(trackedTopics.isActive, true));

    const summaries = await Promise.all(
      topics.map((topic) => this.runForTopic(topic))
    );
    return summaries;
  }

  async runForTopic(topic: typeof trackedTopics.$inferSelect): Promise<{
    topicId: string;
    inserted: number;
    updated: number;
    skipped: number;
    error?: string;
  }> {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    try {
      const posts = await this.apify.fetchPostsByHashtag(topic.value);

      for (const post of posts) {
        const mediaType = ApifyService.normalizeMediaType(post.type);
        const postedAt = new Date(post.timestamp);

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (postedAt < sevenDaysAgo) {
          skipped++;
          continue;
        }

        try {
          const [result] = await db
            .insert(rawPosts)
            .values({
              externalId: post.id,
              source: "apify",
              topicId: topic.id,
              authorHandle: post.ownerUsername,
              authorFollowers: post.followersCount ?? null,
              authorIsVerified: post.isVerified,
              caption: post.caption,
              mediaType,
              mediaUrl: post.displayUrl ?? post.videoUrl ?? null,
              postUrl: post.url,
              likeCount: post.likesCount ?? 0,
              commentCount: post.commentsCount ?? 0,
              shareCount: 0,
              saveCount: 0,
              playCount: post.videoViewCount ?? null,
              hashtags: post.hashtags ?? [],
              mentions: post.mentions ?? [],
              postedAt,
              rawPayload: post as unknown as Record<string, unknown>,
            })
            .onConflictDoUpdate({
              target: rawPosts.externalId,
              set: {
                likeCount: post.likesCount != null
                  ? post.likesCount
                  : sql`${rawPosts.likeCount}`,
                commentCount: post.commentsCount != null
                  ? post.commentsCount
                  : sql`${rawPosts.commentCount}`,
                playCount: post.videoViewCount != null
                  ? post.videoViewCount
                  : sql`${rawPosts.playCount}`,
                authorFollowers: post.followersCount != null
                  ? post.followersCount
                  : sql`${rawPosts.authorFollowers}`,
                rawPayload: post as unknown as Record<string, unknown>,
                fetchedAt: new Date(),
              },
            })
            .returning({ id: rawPosts.id, xmax: sql<string>`xmax::text` });

          if (result?.xmax === "0") inserted++;
          else updated++;
        } catch {
          skipped++;
        }
      }

      await db
        .update(trackedTopics)
        .set({ lastFetchedAt: new Date() })
        .where(eq(trackedTopics.id, topic.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Ingestion] Failed topic ${topic.value}:`, err);
      return { topicId: topic.id, inserted, updated, skipped, error: message };
    }

    return { topicId: topic.id, inserted, updated, skipped };
  }

  /**
   * Re-fetch engagement metrics (likes, comments, play count, follower count) for all
   * stored posts that were NOT returned by the latest hashtag scrape — i.e. posts whose
   * fetchedAt is older than the refresh interval.
   *
   * This ensures every post in the DB has up-to-date numbers before the scoring step,
   * not just the handful of posts the hashtag scraper happened to return this cycle.
   */
  async refreshStalePostMetrics(refreshIntervalMs = 4 * 60 * 60 * 1000): Promise<{
    markedStale: number;
    refreshed: number;
    failed: number;
  }> {
    const fetchThreshold = new Date(Date.now() - refreshIntervalMs);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Step 1 — mark low-virality posts as stale in one batch update.
    // These are posts with likeCount < STALE_LIKE_THRESHOLD that haven't been
    // refreshed this cycle. They won't be retried by the post scraper.
    const markedStaleRows = await db
      .update(rawPosts)
      .set({ isStale: true, fetchedAt: new Date() })
      .where(
        and(
          gte(rawPosts.postedAt, sevenDaysAgo),
          lt(rawPosts.fetchedAt, fetchThreshold),
          lt(rawPosts.likeCount, STALE_LIKE_THRESHOLD),
          eq(rawPosts.isStale, false)
        )
      )
      .returning({ id: rawPosts.id });
    const markedStale = markedStaleRows.length;

    // Step 2 — find posts that still need a refresh: not stale, not recently fetched
    const postsToRefresh = await db
      .select({
        id: rawPosts.id,
        externalId: rawPosts.externalId,
        postUrl: rawPosts.postUrl,
      })
      .from(rawPosts)
      .where(
        and(
          gte(rawPosts.postedAt, sevenDaysAgo),
          lt(rawPosts.fetchedAt, fetchThreshold),
          eq(rawPosts.isStale, false),
          isNotNull(rawPosts.postUrl)
        )
      )
      .limit(50);

    if (postsToRefresh.length === 0) return { markedStale: markedStale ?? 0, refreshed: 0, failed: 0 };

    let freshPosts: Awaited<ReturnType<ApifyService["refreshPostsByUrl"]>>;
    try {
      freshPosts = await this.apify.refreshPostsByUrl(postsToRefresh.map((p) => p.postUrl!));
    } catch (err) {
      console.error("[Ingestion] Post refresh actor failed:", err);
      return { markedStale: markedStale ?? 0, refreshed: 0, failed: postsToRefresh.length };
    }

    const byExternalId = new Map(freshPosts.map((p) => [p.id, p]));
    let refreshed = 0;
    let failed = 0;

    for (const post of postsToRefresh) {
      const fresh = byExternalId.get(post.externalId);

      // Post not returned by Apify — likely deleted from Instagram.
      // Mark stale so we don't burn credits retrying it next cycle.
      if (!fresh) {
        await db
          .update(rawPosts)
          .set({ isStale: true, fetchedAt: new Date() })
          .where(eq(rawPosts.id, post.id));
        failed++;
        continue;
      }

      // If fresh data shows it's now below threshold, mark stale instead of updating
      if ((fresh.likesCount ?? 0) < STALE_LIKE_THRESHOLD) {
        await db
          .update(rawPosts)
          .set({ isStale: true, fetchedAt: new Date() })
          .where(eq(rawPosts.id, post.id));
        failed++;
        continue;
      }

      try {
        await db
          .update(rawPosts)
          .set({
            likeCount: fresh.likesCount ?? sql`${rawPosts.likeCount}`,
            commentCount: fresh.commentsCount ?? sql`${rawPosts.commentCount}`,
            playCount: fresh.videoViewCount ?? sql`${rawPosts.playCount}`,
            authorFollowers: fresh.followersCount ?? sql`${rawPosts.authorFollowers}`,
            fetchedAt: new Date(),
          })
          .where(eq(rawPosts.id, post.id));
        refreshed++;
      } catch {
        failed++;
      }
    }

    return { markedStale: markedStale ?? 0, refreshed, failed };
  }
}
