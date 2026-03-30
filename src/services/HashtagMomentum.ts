import { db } from "@/db/client";
import { hashtagStats } from "@/db/schema";
import { sql } from "drizzle-orm";

export class HashtagMomentumService {
  /**
   * Recompute and persist hashtag stats for all hashtags seen in the last 7 days.
   * Uses a single SQL query (conditional aggregation) instead of N+1 per-hashtag queries.
   */
  async refreshAllHashtagStats(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // One query: unnest hashtag arrays, count per-hashtag in 24h and 7d windows simultaneously.
    // postgres-js returns rows directly as an array (no .rows wrapper).
    const rows: { hashtag: string; count_24h: string; count_7d: string }[] =
      await db.execute(sql`
        SELECT
          tag                                                          AS hashtag,
          COUNT(*) FILTER (WHERE posted_at >= ${oneDayAgo})::text     AS count_24h,
          COUNT(*)::text                                               AS count_7d
        FROM raw_posts, unnest(hashtags) AS t(tag)
        WHERE posted_at >= ${sevenDaysAgo}
        GROUP BY tag
      `);

    if (rows.length === 0) return;

    const inserts = rows.map((r) => {
      const count24h = parseInt(r.count_24h, 10);
      const count7d = parseInt(r.count_7d, 10);
      const dailyAvg7d = count7d / 7;
      const growthRate = dailyAvg7d > 0 ? (count24h - dailyAvg7d) / dailyAvg7d : 0;
      const momentumScore = (Math.tanh(growthRate) + 1) / 2;

      return {
        hashtag: r.hashtag,
        postCount24h: count24h,
        postCount7d: count7d,
        momentumScore: String(momentumScore.toFixed(3)),
      };
    });

    await db.insert(hashtagStats).values(inserts);
  }

  /**
   * Get cached momentum scores for a list of hashtags (from the last recorded stat).
   * Returns a map of hashtag → score (0-1). Defaults to 0.5 for unknown hashtags.
   */
  async getScoresForHashtags(hashtags: string[]): Promise<Map<string, number>> {
    if (hashtags.length === 0) return new Map();

    const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

    const rows: { hashtag: string; momentum_score: string }[] =
      await db.execute(sql`
        SELECT DISTINCT ON (hashtag) hashtag, momentum_score
        FROM hashtag_stats
        WHERE recorded_at >= ${oneDayAgo}
          AND hashtag = ANY(${hashtags})
        ORDER BY hashtag, recorded_at DESC
      `);

    const scores = new Map<string, number>();
    for (const row of rows) {
      scores.set(row.hashtag, parseFloat(row.momentum_score ?? "0.5"));
    }

    for (const tag of hashtags) {
      if (!scores.has(tag)) scores.set(tag, 0.5);
    }

    return scores;
  }
}
