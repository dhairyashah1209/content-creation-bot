"use client";

import { useState } from "react";
import { TopicSelector } from "@/components/dashboard/TopicSelector";
import { TrendFeed } from "@/components/dashboard/TrendFeed";
import { HashtagSparkline } from "@/components/dashboard/HashtagSparkline";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6 py-6 px-4 md:px-8 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Trend Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Real-time Instagram trend intelligence — track hashtags, score posts, discover what&apos;s rising.
        </p>
      </div>

      {/* Topic Filter */}
      <TopicSelector selectedTopicId={selectedTopicId} onSelect={setSelectedTopicId} />

      <Separator />

      {/* Stats Overview */}
      <StatsBar topicId={selectedTopicId} />

      {/* Main content: feed + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        {/* Trend Feed */}
        <TrendFeed topicId={selectedTopicId} />

        {/* Sidebar: hashtag momentum */}
        <div className="sticky top-6">
          <HashtagSparkline />
        </div>
      </div>
    </div>
  );
}
