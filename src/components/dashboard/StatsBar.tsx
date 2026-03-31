"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, TrendingUp, BarChart2, Archive, Hash } from "lucide-react";

interface TrendPost {
  trendTier: string | null;
  trendScore: string | null;
}

interface StatsBarProps {
  topicId: string | null;
}

export function StatsBar({ topicId }: StatsBarProps) {
  const activeParams = new URLSearchParams({ limit: "50" });
  if (topicId) activeParams.set("topicId", topicId);

  const staleParams = new URLSearchParams({ limit: "50", stale: "true" });
  if (topicId) staleParams.set("topicId", topicId);

  const { data: activeData, isLoading: loadingActive } = useQuery<{ posts: TrendPost[]; totalCount: number }>({
    queryKey: ["trends", topicId, "all"],
    queryFn: async () => {
      const res = await fetch(`/api/trends?${activeParams}`);
      return res.json();
    },
  });

  const { data: staleData, isLoading: loadingStale } = useQuery<{ posts: unknown[]; totalCount?: number }>({
    queryKey: ["trends", topicId, "stale"],
    queryFn: async () => {
      const res = await fetch(`/api/trends?${staleParams}`);
      return res.json();
    },
  });

  const isLoading = loadingActive || loadingStale;

  const activePosts = activeData?.posts ?? [];
  const viral = activePosts.filter((p) => p.trendTier === "viral").length;
  const rising = activePosts.filter((p) => p.trendTier === "rising").length;
  const avgScore =
    activePosts.length > 0
      ? (
          activePosts.reduce((sum, p) => sum + parseFloat(p.trendScore ?? "0"), 0) /
          activePosts.length
        ).toFixed(1)
      : "—";
  const staleCount = staleData?.posts?.length ?? 0;
  const totalPosts = (activeData?.totalCount ?? 0) + staleCount;

  const stats = [
    { label: "Total Posts",      value: totalPosts,  icon: Hash,       color: "text-emerald-500" },
    { label: "Viral Posts",      value: viral,       icon: Flame,      color: "text-red-500" },
    { label: "Rising Posts",     value: rising,      icon: TrendingUp, color: "text-orange-500" },
    { label: "Avg Trend Score",  value: avgScore,    icon: BarChart2,  color: "text-blue-500" },
    { label: "Stale Posts",      value: staleCount,  icon: Archive,    color: "text-muted-foreground" },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="flex items-center gap-3 py-4 px-4">
            <s.icon className={`w-5 h-5 shrink-0 ${s.color}`} />
            <div className="flex flex-col">
              <span className="text-2xl font-bold tabular-nums">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
