import { db } from "@/db/client";
import { hashtagStats, rawPosts } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

/**
 * Calculates the momentum score (0-1) for a set of hashtags.
 * Compares posts in the last 24h vs the 7-day daily average.
 */
export class HashtagMomentumService {
  /**
   * Recompute and persist hashtag stats for all hashtags seen in the last 7 days.
   */
  async refreshAllHashtagStats(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get all distinct hashtags seen in the last 7 days
    const rows = await db
      .select({ hashtag: sql<string>`unnest(hashtags)` })
      .from(rawPosts)
      .where(gte(rawPosts.postedAt, sevenDaysAgo))
      .groupBy(sql`unnest(hashtags)`);

    const hashtags = rows.map((r) => r.hashtag).filter(Boolean);

    for (const tag of hashtags) {
      await this.refreshHashtagStat(tag, oneDayAgo, sevenDaysAgo);
    }
  }

  private async refreshHashtagStat(
    tag: string,
    oneDayAgo: Date,
    sevenDaysAgo: Date
  ): Promise<void> {
    // Count posts containing this hashtag in last 24h
    const [count24h] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rawPosts)
      .where(
        and(
          gte(rawPosts.postedAt, oneDayAgo),
          sql`${tag} = ANY(hashtags)`
        )
      );

    // Count posts containing this hashtag in last 7 days
    const [count7d] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rawPosts)
      .where(
        and(
          gte(rawPosts.postedAt, sevenDaysAgo),
          sql`${tag} = ANY(hashtags)`
        )
      );

    const dailyAvg7d = (count7d?.count ?? 0) / 7;
    const current24h = count24h?.count ?? 0;
    const growthRate = dailyAvg7d > 0 ? (current24h - dailyAvg7d) / dailyAvg7d : 0;
    // tanh maps growth rate to (-1, 1), then shift to (0, 1)
    const momentumScore = (Math.tanh(growthRate) + 1) / 2;

    await db.insert(hashtagStats).values({
      hashtag: tag,
      postCount24h: current24h,
      postCount7d: count7d?.count ?? 0,
      momentumScore: String(momentumScore.toFixed(3)),
    });
  }

  /**
   * Get cached momentum scores for a list of hashtags.
   * Returns a map of hashtag → score (0-1).
   */
  async getScoresForHashtags(hashtags: string[]): Promise<Map<string, number>> {
    if (hashtags.length === 0) return new Map();

    const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000); // slightly > 24h

    const rows = await db
      .select({
        hashtag: hashtagStats.hashtag,
        momentumScore: hashtagStats.momentumScore,
      })
      .from(hashtagStats)
      .where(
        and(
          gte(hashtagStats.recordedAt, oneDayAgo),
          sql`hashtag = ANY(${sql.raw(`ARRAY[${hashtags.map((h) => `'${h.replace(/'/g, "''")}'`).join(",")}]`)})`
        )
      );

    const scores = new Map<string, number>();
    for (const row of rows) {
      scores.set(row.hashtag, parseFloat(row.momentumScore ?? "0.5"));
    }

    // Default to 0.5 (neutral) for hashtags with no history
    for (const tag of hashtags) {
      if (!scores.has(tag)) scores.set(tag, 0.5);
    }

    return scores;
  }
}
