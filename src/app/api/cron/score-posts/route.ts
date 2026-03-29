import { NextRequest, NextResponse } from "next/server";
import { TrendScorer } from "@/services/TrendScorer";
import { HashtagMomentumService } from "@/services/HashtagMomentum";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Refresh hashtag momentum stats first, then score posts
  const momentumService = new HashtagMomentumService();
  await momentumService.refreshAllHashtagStats();

  const scorer = new TrendScorer();
  const scored = await scorer.scoreUnprocessedPosts();

  console.log(`[Cron/score-posts] Scored ${scored} posts`);
  return NextResponse.json({ ok: true, scored });
}
