import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { hashtagStats } from "@/db/schema";
import { desc, gte, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

  // Get the latest stat per hashtag from the last 25h
  const rows = await db
    .selectDistinctOn([hashtagStats.hashtag], {
      hashtag: hashtagStats.hashtag,
      postCount24h: hashtagStats.postCount24h,
      postCount7d: hashtagStats.postCount7d,
      momentumScore: hashtagStats.momentumScore,
      recordedAt: hashtagStats.recordedAt,
    })
    .from(hashtagStats)
    .where(gte(hashtagStats.recordedAt, oneDayAgo))
    .orderBy(hashtagStats.hashtag, desc(hashtagStats.recordedAt))
    .limit(100);

  // Sort by momentum score descending, return top N
  const sorted = rows
    .sort((a, b) => parseFloat(b.momentumScore ?? "0") - parseFloat(a.momentumScore ?? "0"))
    .slice(0, limit);

  return NextResponse.json({ stats: sorted });
}
