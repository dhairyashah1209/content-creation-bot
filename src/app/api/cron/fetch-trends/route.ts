import { NextRequest, NextResponse } from "next/server";
import { IngestionService } from "@/services/IngestionService";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new IngestionService();

  // Step 1 — fetch new/updated posts for all tracked topics
  const topicResults = await service.runForAllActiveTopics();
  const totalInserted = topicResults.reduce((sum, r) => sum + r.inserted, 0);
  const totalUpdated = topicResults.reduce((sum, r) => sum + (r.updated ?? 0), 0);
  const totalSkipped = topicResults.reduce((sum, r) => sum + r.skipped, 0);

  console.log(
    `[Cron/fetch-trends] Topics: ${topicResults.length}, ` +
    `Inserted: ${totalInserted}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}`
  );

  // Step 2 — refresh engagement metrics for previously stored posts that weren't
  // returned by the hashtag scraper this cycle (their fetchedAt is older than 4h).
  // This ensures ALL posts in the DB have up-to-date likes/comments before scoring.
  const { markedStale, refreshed, failed } = await service.refreshStalePostMetrics();

  console.log(
    `[Cron/fetch-trends] Stale refresh — MarkedStale: ${markedStale}, Refreshed: ${refreshed}, Failed: ${failed}`
  );

  return NextResponse.json({
    ok: true,
    topics: topicResults.length,
    inserted: totalInserted,
    updated: totalUpdated,
    skipped: totalSkipped,
    staleRefresh: { markedStale, refreshed, failed },
    results: topicResults,
  });
}
