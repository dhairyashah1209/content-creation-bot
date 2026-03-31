import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { rawPosts, trendSnapshots } from "@/db/schema";
import { eq, gte, and, sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Build topic filter for raw_posts queries
  const activeConditions = [
    gte(rawPosts.postedAt, sevenDaysAgo),
    eq(rawPosts.isStale, false),
  ];
  const staleConditions = [
    gte(rawPosts.postedAt, sevenDaysAgo),
    eq(rawPosts.isStale, true),
  ];
  if (topicId) {
    activeConditions.push(eq(rawPosts.topicId, topicId));
    staleConditions.push(eq(rawPosts.topicId, topicId));
  }

  // Latest snapshot per post (subquery)
  const latestSnapshots = db
    .selectDistinctOn([trendSnapshots.postId], {
      postId: trendSnapshots.postId,
      trendScore: trendSnapshots.trendScore,
      trendTier: trendSnapshots.trendTier,
    })
    .from(trendSnapshots)
    .orderBy(trendSnapshots.postId, desc(trendSnapshots.snapshotTime))
    .as("latest_snapshots");

  // Count viral, rising, and compute avg score across ALL active posts (no limit)
  const [tierStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      viral: sql<number>`count(*) FILTER (WHERE ${latestSnapshots.trendTier} = 'viral')::int`,
      rising: sql<number>`count(*) FILTER (WHERE ${latestSnapshots.trendTier} = 'rising')::int`,
      avgScore: sql<string>`coalesce(round(avg(CAST(${latestSnapshots.trendScore} AS numeric)), 1)::text, '0')`,
    })
    .from(rawPosts)
    .innerJoin(latestSnapshots, eq(rawPosts.id, latestSnapshots.postId))
    .where(and(...activeConditions));

  // Count stale posts
  const [{ staleCount }] = await db
    .select({ staleCount: sql<number>`count(*)::int` })
    .from(rawPosts)
    .where(and(...staleConditions));

  return NextResponse.json({
    totalActive: tierStats.total,
    viral: tierStats.viral,
    rising: tierStats.rising,
    avgScore: tierStats.avgScore,
    staleCount,
    totalPosts: tierStats.total + staleCount,
  });
}
