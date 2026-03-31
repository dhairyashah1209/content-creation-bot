import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Use raw SQL to guarantee correct DISTINCT ON behavior and accurate counts.
  // The CTE picks the latest snapshot per post, then we aggregate over it.
  const rows: {
    total_active: string;
    viral: string;
    rising: string;
    avg_score: string;
    stale_count: string;
  }[] = await db.execute(sql`
    WITH latest_snap AS (
      SELECT DISTINCT ON (ts.post_id)
        ts.post_id,
        ts.trend_score,
        ts.trend_tier
      FROM trend_snapshots ts
      ORDER BY ts.post_id, ts.snapshot_time DESC
    )
    SELECT
      count(*) FILTER (
        WHERE rp.is_stale = false AND ls.post_id IS NOT NULL
      )::text AS total_active,
      count(*) FILTER (
        WHERE rp.is_stale = false AND ls.trend_tier = 'viral'
      )::text AS viral,
      count(*) FILTER (
        WHERE rp.is_stale = false AND ls.trend_tier = 'rising'
      )::text AS rising,
      coalesce(
        round(
          avg(CAST(ls.trend_score AS numeric)) FILTER (
            WHERE rp.is_stale = false AND ls.post_id IS NOT NULL
          ), 1
        )::text,
        '0'
      ) AS avg_score,
      count(*) FILTER (WHERE rp.is_stale = true)::text AS stale_count
    FROM raw_posts rp
    LEFT JOIN latest_snap ls ON rp.id = ls.post_id
    WHERE rp.posted_at >= ${sevenDaysAgo}::timestamptz
      AND rp.topic_id IS NOT NULL
      ${topicId ? sql`AND rp.topic_id = ${topicId}::uuid` : sql``}
  `);

  const row = rows[0];
  const totalActive = parseInt(row.total_active, 10);
  const staleCount = parseInt(row.stale_count, 10);

  return NextResponse.json({
    totalActive,
    viral: parseInt(row.viral, 10),
    rising: parseInt(row.rising, 10),
    avgScore: row.avg_score,
    staleCount,
    totalPosts: totalActive + staleCount,
  });
}
