"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { TrendScoreCard } from "./TrendScoreCard";
import { StalePostCard } from "./StalePostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type TabValue = "all" | "viral" | "rising" | "steady" | "stale";

const PAGE_SIZE = 30;

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
  isStale: boolean;
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
  const [tab, setTab] = useState<TabValue>("all");

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["trends", topicId, tab],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(pageParam),
      });
      if (topicId) params.set("topicId", topicId);

      if (tab === "stale") {
        params.set("stale", "true");
      } else if (tab !== "all") {
        params.set("tier", tab);
      }

      const res = await fetch(`/api/trends?${params}`);
      const json = await res.json();
      return json.posts as TrendPost[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.reduce((total, page) => total + page.length, 0);
    },
  });

  const posts = data?.pages.flat() ?? [];
  const isStaleTab = tab === "stale";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="viral">🔥 Viral</TabsTrigger>
            <TabsTrigger value="rising">📈 Rising</TabsTrigger>
            <TabsTrigger value="steady">💧 Steady</TabsTrigger>
            <TabsTrigger value="stale" className="text-muted-foreground">
              🗂️ Stale
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {isFetching && !isLoading && !isFetchingNextPage && (
          <span className="text-xs text-muted-foreground animate-pulse">Refreshing…</span>
        )}
      </div>

      {isStaleTab && (
        <p className="text-xs text-muted-foreground">
          Posts with fewer than 10 likes — excluded from trend tracking and scoring.
        </p>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-2">
          <span className="text-4xl">{isStaleTab ? "✅" : "📭"}</span>
          <p className="text-sm">
            {isStaleTab ? "No stale posts." : "No trending posts yet."}
          </p>
          <p className="text-xs">
            {isStaleTab
              ? "All fetched posts currently meet the virality threshold."
              : "Add a topic above and trigger a fetch to see results."}
          </p>
        </div>
      )}

      {posts.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {posts.map((post) =>
              isStaleTab ? (
                <StalePostCard key={post.id} post={post} />
              ) : (
                <TrendScoreCard key={post.id} post={post} />
              )
            )}
          </div>

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading…" : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
