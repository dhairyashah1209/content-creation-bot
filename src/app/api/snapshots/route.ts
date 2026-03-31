import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { rawPosts, trendSnapshots } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get("postId");
  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  const [postRows, snapshotRows] = await Promise.all([
    db
      .select({
        id: rawPosts.id,
        authorHandle: rawPosts.authorHandle,
        authorFollowers: rawPosts.authorFollowers,
        authorIsVerified: rawPosts.authorIsVerified,
        caption: rawPosts.caption,
        mediaType: rawPosts.mediaType,
        postUrl: rawPosts.postUrl,
        likeCount: rawPosts.likeCount,
        commentCount: rawPosts.commentCount,
        hashtags: rawPosts.hashtags,
        postedAt: rawPosts.postedAt,
      })
      .from(rawPosts)
      .where(eq(rawPosts.id, postId))
      .limit(1),
    db
      .select({
        snapshotTime: trendSnapshots.snapshotTime,
        likesAtSnapshot: trendSnapshots.likesAtSnapshot,
        commentsAtSnapshot: trendSnapshots.commentsAtSnapshot,
        engagementVelocityScore: trendSnapshots.engagementVelocityScore,
        hashtagMomentumScore: trendSnapshots.hashtagMomentumScore,
        recencyScore: trendSnapshots.recencyScore,
        formatMultiplier: trendSnapshots.formatMultiplier,
        trendScore: trendSnapshots.trendScore,
        trendTier: trendSnapshots.trendTier,
        engagementRate: trendSnapshots.engagementRate,
        velocityDelta: trendSnapshots.velocityDelta,
      })
      .from(trendSnapshots)
      .where(eq(trendSnapshots.postId, postId))
      .orderBy(asc(trendSnapshots.snapshotTime)),
  ]);

  if (postRows.length === 0) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({ post: postRows[0], snapshots: snapshotRows });
}
