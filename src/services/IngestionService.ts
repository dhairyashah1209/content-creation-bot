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
                // Don't update engagement fields here — hashtag scraper returns
                // inaccurate counts (scraped from listing pages, not post pages).
                // refreshStalePostMetrics() uses the post scraper for accurate data.
                // We DO update metadata that the hashtag scraper gets right:
                authorFollowers: post.followersCount != null
                  ? post.followersCount
                  : sql`${rawPosts.authorFollowers}`,
                rawPayload: post as unknown as Record<string, unknown>,
                // Don't update fetchedAt — keeps the post eligible for
                // refreshStalePostMetrics() which gets accurate engagement.
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
    unmatched: number;
  }> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // ── Step 1: Refresh engagement for non-stale posts via post scraper ──
    // This runs FIRST so that likeCount is accurate before we decide what's stale.
    // Limited to 50 posts per cycle to stay within Vercel's 300s function timeout.
    // Posts are ordered by fetchedAt ASC so the least recently refreshed get priority.
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
          eq(rawPosts.isStale, false),
          isNotNull(rawPosts.postUrl)
        )
      )
      .orderBy(rawPosts.fetchedAt)
      .limit(20);

    let refreshed = 0;
    let failed = 0;
    let unmatched = 0;

    if (postsToRefresh.length > 0) {
      console.log(`[Ingestion] Refreshing engagement for ${postsToRefresh.length} posts via post scraper`);

      let freshPosts: Awaited<ReturnType<ApifyService["refreshPostsByUrl"]>>;
      try {
        freshPosts = await this.apify.refreshPostsByUrl(postsToRefresh.map((p) => p.postUrl!));
      } catch (err) {
        console.error("[Ingestion] Post refresh actor failed:", err);
        return { markedStale: 0, refreshed: 0, failed: postsToRefresh.length, unmatched: 0 };
      }

      // Log raw sample to help debug field name mismatches
      console.log(
        `[Ingestion] Post scraper returned ${freshPosts.length} results. ` +
        `Sample keys: ${freshPosts.length > 0 ? Object.keys(freshPosts[0]).join(", ") : "none"}. ` +
        `Sample: ${freshPosts.slice(0, 2).map((p) => JSON.stringify({ id: p.id, shortCode: p.shortCode, url: p.url, likesCount: p.likesCount })).join("; ")}`
      );

      // Extract shortcode from an Instagram URL: /p/ABC123/ or /reel/ABC123/
      const extractShortcode = (url: string): string => {
        const match = url.match(/\/(p|reel|tv)\/([^/?]+)/);
        return match?.[2] ?? "";
      };

      // Primary matching: by URL shortcode (most reliable across different Apify actors).
      const byUrlShortcode = new Map<string, (typeof freshPosts)[0]>();
      const byId = new Map<string, (typeof freshPosts)[0]>();
      const byShortCode = new Map<string, (typeof freshPosts)[0]>();

      for (const fp of freshPosts) {
        if (fp.url) byUrlShortcode.set(extractShortcode(fp.url), fp);
        if (fp.id) byId.set(fp.id, fp);
        if (fp.shortCode) byShortCode.set(fp.shortCode, fp);
      }

      for (const post of postsToRefresh) {
        const postShortcode = post.postUrl ? extractShortcode(post.postUrl) : "";

        const fresh =
          (postShortcode ? byUrlShortcode.get(postShortcode) : undefined) ??
          byId.get(post.externalId) ??
          byShortCode.get(post.externalId);

        if (!fresh) {
          unmatched++;
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

      if (unmatched > 0) {
        console.warn(`[Ingestion] ${unmatched} posts could not be matched to Apify results`);
      }
    }

    // ── Step 2: Mark low-engagement posts as stale AFTER refresh ──
    // Now likeCount reflects accurate data from the post scraper,
    // so we won't falsely mark posts as stale based on inaccurate hashtag scraper data.
    const markedStaleRows = await db
      .update(rawPosts)
      .set({ isStale: true, fetchedAt: new Date() })
      .where(
        and(
          gte(rawPosts.postedAt, sevenDaysAgo),
          lt(rawPosts.likeCount, STALE_LIKE_THRESHOLD),
          eq(rawPosts.isStale, false)
        )
      )
      .returning({ id: rawPosts.id });
    const markedStale = markedStaleRows.length;

    return { markedStale, refreshed, failed, unmatched };
  }
}
