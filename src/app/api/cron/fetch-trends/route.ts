import { NextRequest, NextResponse } from "next/server";
import { IngestionService } from "@/services/IngestionService";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes (Vercel Pro/Hobby limit)

export async function GET(req: NextRequest) {
  // Verify this is a legitimate Vercel Cron call
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = new IngestionService();
  const results = await service.runForAllActiveTopics();

  const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
  const totalUpdated = results.reduce((sum, r) => sum + (r.updated ?? 0), 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

  console.log(`[Cron/fetch-trends] Topics: ${results.length}, Inserted: ${totalInserted}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}`);

  return NextResponse.json({ ok: true, topics: results.length, inserted: totalInserted, updated: totalUpdated, skipped: totalSkipped, results });
}
