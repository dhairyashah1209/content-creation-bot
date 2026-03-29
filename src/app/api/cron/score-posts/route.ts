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

  try {
    const momentumService = new HashtagMomentumService();
    await momentumService.refreshAllHashtagStats();

    const scorer = new TrendScorer();
    const { newlyScored, reScored } = await scorer.scoreAllRecentPosts();

    console.log(`[Cron/score-posts] Newly scored: ${newlyScored}, Re-scored: ${reScored}`);
    return NextResponse.json({ ok: true, newlyScored, reScored });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Cron/score-posts] Error:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
