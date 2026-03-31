import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { rawPosts, trackedTopics } from "@/db/schema";
import { eq, isNull, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const topics = await db
    .select()
    .from(trackedTopics)
    .orderBy(trackedTopics.createdAt);

  return NextResponse.json({ topics });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { value, topicType = "hashtag" } = body as {
    value: string;
    topicType?: "hashtag" | "keyword";
  };

  if (!value?.trim()) {
    return NextResponse.json({ error: "value is required" }, { status: 400 });
  }

  // Normalize hashtag: ensure # prefix
  const normalized =
    topicType === "hashtag"
      ? value.startsWith("#")
        ? value.toLowerCase()
        : `#${value.toLowerCase()}`
      : value.toLowerCase();

  const [topic] = await db
    .insert(trackedTopics)
    .values({ value: normalized, topicType })
    .onConflictDoNothing()
    .returning();

  // Re-link orphaned posts whose hashtags match this topic.
  // This recovers posts that lost their topicId when a topic was previously deleted.
  if (topic) {
    const tag = normalized.replace(/^#/, "");
    const relinked = await db
      .update(rawPosts)
      .set({ topicId: topic.id })
      .where(
        sql`${isNull(rawPosts.topicId)} AND ${sql`${tag}`} = ANY(${rawPosts.hashtags})`
      )
      .returning({ id: rawPosts.id });

    return NextResponse.json({ topic, relinked: relinked.length }, { status: 201 });
  }

  return NextResponse.json({ topic }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(trackedTopics).where(eq(trackedTopics.id, id));
  return NextResponse.json({ ok: true });
}
