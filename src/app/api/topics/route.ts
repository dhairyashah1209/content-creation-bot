import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { trackedTopics } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  return NextResponse.json({ topic }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(trackedTopics).where(eq(trackedTopics.id, id));
  return NextResponse.json({ ok: true });
}
