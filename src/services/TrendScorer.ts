import { db } from "@/db/client";
import { rawPosts, trendSnapshots } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";import { HashtagMomentumService } from "./HashtagMomentum";
import type { ScoreBreakdown, TrendTier } from "@/types";

// Scoring weights (must sum to 1.0)
const WEIGHTS = {
  engagementVelocity: 0.35,
  reachAmplification: 0.25,
  hashtagMomentum: 0.20,
  recency: 0.10,
  formatMultiplier: 0.10,
};

const FORMAT_MULTIPLIERS: Record<string, number> = {
  reel: 1.0,
  carousel: 0.85,
  video: 0.9,
  image: 0.65,
  story: 0.4,
};

// Calibration constant for velocity normalization — tuned to dataset percentiles
const VELOCITY_SCALING = 0.001;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export class TrendScorer {
  private momentumService: HashtagMomentumService;

  constructor() {
    this.momentumService = new HashtagMomentumService();
  }

  /** Score a single post and return the breakdown (0-1 each component, 0-10 composite) */
  scorePost(
    post: {
      likeCount: number;
      commentCount: number;
      saveCount: number;
      shareCount: number;
      playCount: number | null;
      authorFollowers: number | null;
      authorIsVerified: boolean;
      mediaType: string | null;
      postedAt: Date;
    },
    hashtagMomentumScore: number
  ): ScoreBreakdown {
    const now = Date.now();
    const hoursOld = Math.max((now - post.postedAt.getTime()) / 3_600_000, 0.25);

    // ── 1. Engagement Velocity ───────────────────────────────────────────────
    const followers = Math.max(post.authorFollowers ?? 1000, 1);
    const rawEngagement = post.likeCount + post.commentCount * 3 + post.saveCount * 5;
    const rawVelocity = rawEngagement / hoursOld;
    const normalizedVelocity = rawVelocity / Math.sqrt(followers);
    const decayFactor = Math.exp(-0.05 * hoursOld);
    const engagementVelocity = clamp(
      sigmoid(normalizedVelocity * decayFactor * VELOCITY_SCALING * 10),
      0,
      1
    );

    // ── 2. Reach Amplification ───────────────────────────────────────────────
    const amplificationSignals = post.shareCount + 0; // mentions not available from Apify
    const viralK = (amplificationSignals / Math.max(followers, 1)) * 1000;
    const verifiedPenalty = post.authorIsVerified ? 0.7 : 1.0;
    const reachAmplification = clamp(viralK * verifiedPenalty, 0, 1);

    // ── 3. Hashtag Momentum ──────────────────────────────────────────────────
    // Pre-computed and passed in from the HashtagMomentumService
    const hashtagMomentum = clamp(hashtagMomentumScore, 0, 1);

    // ── 4. Recency ───────────────────────────────────────────────────────────
    let recency: number;
    if (hoursOld <= 6) recency = 1.0;
    else if (hoursOld <= 24) recency = 0.8;
    else if (hoursOld <= 48) recency = 0.5;
    else if (hoursOld <= 72) recency = 0.2;
    else recency = Math.max(0, 0.1 - (hoursOld - 72) / 1000);

    // ── 5. Format Multiplier ─────────────────────────────────────────────────
    const formatMultiplier = FORMAT_MULTIPLIERS[post.mediaType ?? "image"] ?? 0.65;

    // ── Composite (0-10) ─────────────────────────────────────────────────────
    const composite =
      10 *
      (WEIGHTS.engagementVelocity * engagementVelocity +
        WEIGHTS.reachAmplification * reachAmplification +
        WEIGHTS.hashtagMomentum * hashtagMomentum +
        WEIGHTS.recency * recency +
        WEIGHTS.formatMultiplier * formatMultiplier);

    const tier = this.classifyTier(composite);

    return {
      engagementVelocity: parseFloat(engagementVelocity.toFixed(3)),
      reachAmplification: parseFloat(reachAmplification.toFixed(3)),
      hashtagMomentum: parseFloat(hashtagMomentum.toFixed(3)),
      recency: parseFloat(recency.toFixed(3)),
      formatMultiplier: parseFloat(formatMultiplier.toFixed(3)),
      composite: parseFloat(composite.toFixed(3)),
      tier,
    };
  }

  private classifyTier(score: number): TrendTier {
    if (score >= 8.5) return "viral";
    if (score >= 6.5) return "rising";
    if (score >= 4.0) return "steady";
    if (score >= 2.0) return "declining";
    return "dormant";
  }

  /**
   * Score all posts from the last 7 days — both new (unscored) and existing.
   * Creates a new trend snapshot each run, enabling velocity tracking over time.
   * Called by the /api/cron/score-posts route after ingestion.
   */
  async scoreAllRecentPosts(): Promise<{ newlyScored: number; reScored: number }> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentPosts = await db
      .select()
      .from(rawPosts)
      .where(and(gte(rawPosts.postedAt, sevenDaysAgo), eq(rawPosts.isStale, false)))
      .limit(500);

    if (recentPosts.length === 0) return { newlyScored: 0, reScored: 0 };

    // Fetch the latest snapshot for each post to compute velocityDelta
    const latestSnapshotRows = await db
      .select({
        postId: trendSnapshots.postId,
        trendScore: trendSnapshots.trendScore,
        engagementVelocityScore: trendSnapshots.engagementVelocityScore,
      })
      .from(trendSnapshots)
      .where(
        sql`${trendSnapshots.postId} IN (${sql.join(
          recentPosts.map((p) => sql`${p.id}`),
          sql`, `
        )}) AND ${trendSnapshots.id} IN (
          SELECT DISTINCT ON (post_id) id FROM trend_snapshots
          WHERE post_id IN (${sql.join(
            recentPosts.map((p) => sql`${p.id}`),
            sql`, `
          )})
          ORDER BY post_id, snapshot_time DESC
        )`
      );

    const prevScoreMap = new Map<string, { trendScore: number; velocityScore: number }>(
      latestSnapshotRows.map((r) => [
        r.postId,
        {
          trendScore: parseFloat(r.trendScore),
          velocityScore: parseFloat(r.engagementVelocityScore),
        },
      ])
    );

    // Gather all unique hashtags from these posts
    const allHashtags = [...new Set(recentPosts.flatMap((p) => (p.hashtags ?? []) as string[]))];
    const momentumScores = await this.momentumService.getScoresForHashtags(allHashtags);

    let newlyScored = 0;
    let reScored = 0;

    // Build all snapshot rows first, then insert in a single batch query
    const snapshotValues: (typeof trendSnapshots.$inferInsert)[] = [];

    for (const post of recentPosts) {
      const hashtagSet = (post.hashtags ?? []) as string[];
      const topHashtags = hashtagSet.slice(0, 5);
      const avgMomentum =
        topHashtags.length > 0
          ? topHashtags.reduce((sum: number, tag: string) => sum + (momentumScores.get(tag) ?? 0.5), 0) /
            topHashtags.length
          : 0.5;

      const breakdown = this.scorePost(
        {
          likeCount: post.likeCount ?? 0,
          commentCount: post.commentCount ?? 0,
          saveCount: post.saveCount ?? 0,
          shareCount: post.shareCount ?? 0,
          playCount: post.playCount ?? null,
          authorFollowers: post.authorFollowers ?? null,
          authorIsVerified: post.authorIsVerified,
          mediaType: post.mediaType,
          postedAt: post.postedAt,
        },
        avgMomentum
      );

      const totalEngagement = (post.likeCount ?? 0) + (post.commentCount ?? 0);
      const engRate =
        post.authorFollowers && post.authorFollowers > 0
          ? totalEngagement / post.authorFollowers
          : null;

      // Compute velocityDelta from previous snapshot
      const prev = prevScoreMap.get(post.id);
      const velocityDelta = prev != null
        ? parseFloat((breakdown.engagementVelocity - prev.velocityScore).toFixed(3))
        : null;

      snapshotValues.push({
        postId: post.id,
        likesAtSnapshot: post.likeCount,
        commentsAtSnapshot: post.commentCount,
        engagementVelocityScore: String(breakdown.engagementVelocity),
        reachAmplificationScore: String(breakdown.reachAmplification),
        hashtagMomentumScore: String(breakdown.hashtagMomentum),
        recencyScore: String(breakdown.recency),
        formatMultiplier: String(breakdown.formatMultiplier),
        trendScore: String(breakdown.composite),
        trendTier: breakdown.tier,
        estimatedReach: post.authorFollowers
          ? Math.round(post.authorFollowers * 0.3)
          : null,
        engagementRate: engRate != null ? String(engRate.toFixed(4)) : null,
        velocityDelta: velocityDelta != null ? String(velocityDelta) : null,
      });

      if (prev != null) reScored++;
      else newlyScored++;
    }

    // Single batch insert — 1 round-trip regardless of post count
    if (snapshotValues.length > 0) {
      await db.insert(trendSnapshots).values(snapshotValues);
    }

    return { newlyScored, reScored };
  }
}
