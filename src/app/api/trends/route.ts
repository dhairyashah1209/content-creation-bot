import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { rawPosts, trendSnapshots } from "@/db/schema";
import { eq, desc, gte, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");
  const tier = searchParams.get("tier");
  const stale = searchParams.get("stale") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // ── Stale posts section ─────────────────────────────────────────────────────
  // Uses a LEFT JOIN so posts with no snapshot (never scored) still appear.
  // Sorted by postedAt desc — trend score is meaningless for stale posts.
  if (stale) {
    const conditions = [
      gte(rawPosts.postedAt, sevenDaysAgo),
      eq(rawPosts.isStale, true),
    ];
    if (topicId) conditions.push(eq(rawPosts.topicId, topicId));

    const latestSnapshots = db
      .selectDistinctOn([trendSnapshots.postId], {
        postId: trendSnapshots.postId,
        trendScore: trendSnapshots.trendScore,
        trendTier: trendSnapshots.trendTier,
        engagementVelocityScore: trendSnapshots.engagementVelocityScore,
        reachAmplificationScore: trendSnapshots.reachAmplificationScore,
        hashtagMomentumScore: trendSnapshots.hashtagMomentumScore,
        recencyScore: trendSnapshots.recencyScore,
        formatMultiplier: trendSnapshots.formatMultiplier,
        engagementRate: trendSnapshots.engagementRate,
        snapshotTime: trendSnapshots.snapshotTime,
      })
      .from(trendSnapshots)
      .orderBy(trendSnapshots.postId, desc(trendSnapshots.snapshotTime))
      .as("latest_snapshots");

    const rows = await db
      .select({
        id: rawPosts.id,
        externalId: rawPosts.externalId,
        authorHandle: rawPosts.authorHandle,
        authorFollowers: rawPosts.authorFollowers,
        authorIsVerified: rawPosts.authorIsVerified,
        caption: rawPosts.caption,
        mediaType: rawPosts.mediaType,
        mediaUrl: rawPosts.mediaUrl,
        postUrl: rawPosts.postUrl,
        likeCount: rawPosts.likeCount,
        commentCount: rawPosts.commentCount,
        hashtags: rawPosts.hashtags,
        postedAt: rawPosts.postedAt,
        topicId: rawPosts.topicId,
        isStale: rawPosts.isStale,
        trendScore: latestSnapshots.trendScore,
        trendTier: latestSnapshots.trendTier,
        engagementVelocityScore: latestSnapshots.engagementVelocityScore,
        reachAmplificationScore: latestSnapshots.reachAmplificationScore,
        hashtagMomentumScore: latestSnapshots.hashtagMomentumScore,
        recencyScore: latestSnapshots.recencyScore,
        formatMultiplier: latestSnapshots.formatMultiplier,
        engagementRate: latestSnapshots.engagementRate,
        snapshotTime: latestSnapshots.snapshotTime,
      })
      .from(rawPosts)
      .leftJoin(latestSnapshots, eq(rawPosts.id, latestSnapshots.postId))
      .where(and(...conditions))
      .orderBy(desc(rawPosts.postedAt))
      .limit(limit);

    return NextResponse.json({ posts: rows });
  }

  // ── Active posts section (default) ─────────────────────────────────────────
  // Uses INNER JOIN — only posts with at least one scored snapshot appear.
  // Sorted by trend score desc so highest-scoring posts surface first.
  const latestSnapshots = db
    .selectDistinctOn([trendSnapshots.postId], {
      postId: trendSnapshots.postId,
      trendScore: trendSnapshots.trendScore,
      trendTier: trendSnapshots.trendTier,
      engagementVelocityScore: trendSnapshots.engagementVelocityScore,
      reachAmplificationScore: trendSnapshots.reachAmplificationScore,
      hashtagMomentumScore: trendSnapshots.hashtagMomentumScore,
      recencyScore: trendSnapshots.recencyScore,
      formatMultiplier: trendSnapshots.formatMultiplier,
      engagementRate: trendSnapshots.engagementRate,
      snapshotTime: trendSnapshots.snapshotTime,
    })
    .from(trendSnapshots)
    .orderBy(trendSnapshots.postId, desc(trendSnapshots.snapshotTime))
    .as("latest_snapshots");

  const conditions = [
    gte(rawPosts.postedAt, sevenDaysAgo),
    eq(rawPosts.isStale, false),
  ];

  if (topicId) conditions.push(eq(rawPosts.topicId, topicId));
  if (tier) conditions.push(eq(latestSnapshots.trendTier, tier as "viral" | "rising" | "steady" | "declining" | "dormant"));

  const rows = await db
    .select({
      id: rawPosts.id,
      externalId: rawPosts.externalId,
      authorHandle: rawPosts.authorHandle,
      authorFollowers: rawPosts.authorFollowers,
      authorIsVerified: rawPosts.authorIsVerified,
      caption: rawPosts.caption,
      mediaType: rawPosts.mediaType,
      mediaUrl: rawPosts.mediaUrl,
      postUrl: rawPosts.postUrl,
      likeCount: rawPosts.likeCount,
      commentCount: rawPosts.commentCount,
      hashtags: rawPosts.hashtags,
      postedAt: rawPosts.postedAt,
      topicId: rawPosts.topicId,
      isStale: rawPosts.isStale,
      trendScore: latestSnapshots.trendScore,
      trendTier: latestSnapshots.trendTier,
      engagementVelocityScore: latestSnapshots.engagementVelocityScore,
      reachAmplificationScore: latestSnapshots.reachAmplificationScore,
      hashtagMomentumScore: latestSnapshots.hashtagMomentumScore,
      recencyScore: latestSnapshots.recencyScore,
      formatMultiplier: latestSnapshots.formatMultiplier,
      engagementRate: latestSnapshots.engagementRate,
      snapshotTime: latestSnapshots.snapshotTime,
    })
    .from(rawPosts)
    .innerJoin(latestSnapshots, eq(rawPosts.id, latestSnapshots.postId))
    .where(and(...conditions))
    .orderBy(desc(sql`CAST(${latestSnapshots.trendScore} AS NUMERIC)`))
    .limit(limit);

  // Compute total count of active (non-stale) posts in the 7-day window (ignoring limit).
  const countConditions = [
    gte(rawPosts.postedAt, sevenDaysAgo),
    eq(rawPosts.isStale, false),
  ];
  if (topicId) countConditions.push(eq(rawPosts.topicId, topicId));

  const [{ count: totalCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rawPosts)
    .where(and(...countConditions));

  return NextResponse.json({ posts: rows, totalCount });
}
