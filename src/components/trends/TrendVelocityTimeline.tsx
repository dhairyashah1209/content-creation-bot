"use client";

import { useState } from "react";
import { TopicSelector } from "@/components/dashboard/TopicSelector";
import { PostSelector } from "./PostSelector";
import { TimelinePanel } from "./TimelinePanel";

export function TrendVelocityTimeline() {
  const [topicId, setTopicId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trend Velocity Timeline</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select a post to visualize how its trend score, components, and engagement evolved over time.
        </p>
      </div>

      <TopicSelector selectedTopicId={topicId} onSelect={(id) => { setTopicId(id); setSelectedPostId(null); }} />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <PostSelector
          topicId={topicId}
          selectedPostId={selectedPostId}
          onSelectPost={setSelectedPostId}
        />

        {selectedPostId ? (
          <TimelinePanel postId={selectedPostId} />
        ) : (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground border border-dashed rounded-lg">
            <p className="text-sm">Select a post from the list to view its timeline</p>
          </div>
        )}
      </div>
    </div>
  );
}
