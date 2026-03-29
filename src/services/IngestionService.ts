import { db } from "@/db/client";
import { rawPosts, trackedTopics } from "@/db/schema";
import { ApifyService } from "./ApifyService";
import { eq, and, sql } from "drizzle-orm";

export class IngestionService {
  private apify: ApifyService;

  constructor() {
    this.apify = new ApifyService();
  }

  async runForAllActiveTopics(): Promise<{ topicId: string; inserted: number; updated: number; skipped: number; error?: string }[]> {
    const topics = await db
      .select()
      .from(trackedTopics)
      .where(and(eq(trackedTopics.isActive, true)));

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

        // Skip posts older than 7 days — not useful for trend analysis
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (postedAt < sevenDaysAgo) {
          skipped++;
          continue;
        }

        try {
          // xmax = 0 on the returned row means it was a fresh INSERT (not an UPDATE)
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
                // Use existing column value as fallback so a null from Apify
                // never overwrites a valid count we already stored
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

      // Mark topic as fetched
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
}
