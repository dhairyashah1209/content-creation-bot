"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendScoreCard } from "./TrendScoreCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

type TierFilter = "all" | "viral" | "rising" | "steady";

interface TrendPost {
  id: string;
  authorHandle: string | null;
  authorIsVerified: boolean;
  caption: string | null;
  mediaType: string | null;
  postUrl: string | null;
  likeCount: number;
  commentCount: number;
  hashtags: string[];
  postedAt: string;
  trendScore: string | null;
  trendTier: string | null;
  engagementVelocityScore: string | null;
  reachAmplificationScore: string | null;
  hashtagMomentumScore: string | null;
  recencyScore: string | null;
  engagementRate: string | null;
}

interface TrendFeedProps {
  topicId: string | null;
}

export function TrendFeed({ topicId }: TrendFeedProps) {
  const [tier, setTier] = useState<TierFilter>("all");

  const queryKey = ["trends", topicId, tier];

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "24" });
      if (topicId) params.set("topicId", topicId);
      if (tier !== "all") params.set("tier", tier);
      const res = await fetch(`/api/trends?${params}`);
      const json = await res.json();
      return json.posts as TrendPost[];
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Tabs value={tier} onValueChange={(v) => setTier(v as TierFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="viral">🔥 Viral</TabsTrigger>
            <TabsTrigger value="rising">📈 Rising</TabsTrigger>
            <TabsTrigger value="steady">💧 Steady</TabsTrigger>
          </TabsList>
        </Tabs>
        {isFetching && !isLoading && (
          <span className="text-xs text-muted-foreground animate-pulse">Refreshing…</span>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-2">
          <span className="text-4xl">📭</span>
          <p className="text-sm">No trending posts yet.</p>
          <p className="text-xs">Add a topic above and trigger a fetch to see results.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((post) => (
            <TrendScoreCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
