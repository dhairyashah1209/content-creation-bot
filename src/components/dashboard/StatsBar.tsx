"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, TrendingUp, BarChart2, Layers } from "lucide-react";

interface TrendPost {
  trendTier: string | null;
  trendScore: string | null;
}

interface StatsBarProps {
  topicId: string | null;
}

export function StatsBar({ topicId }: StatsBarProps) {
  const { data, isLoading } = useQuery<TrendPost[]>({
    queryKey: ["trends", topicId, "all"],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (topicId) params.set("topicId", topicId);
      const res = await fetch(`/api/trends?${params}`);
      const json = await res.json();
      return json.posts as TrendPost[];
    },
  });

  const viral = data?.filter((p) => p.trendTier === "viral").length ?? 0;
  const rising = data?.filter((p) => p.trendTier === "rising").length ?? 0;
  const avgScore =
    data && data.length > 0
      ? (
          data.reduce((sum, p) => sum + parseFloat(p.trendScore ?? "0"), 0) / data.length
        ).toFixed(1)
      : "—";
  const total = data?.length ?? 0;

  const stats = [
    { label: "Viral Posts", value: viral, icon: Flame, color: "text-red-500" },
    { label: "Rising Posts", value: rising, icon: TrendingUp, color: "text-orange-500" },
    { label: "Avg Trend Score", value: avgScore, icon: BarChart2, color: "text-blue-500" },
    { label: "Posts Tracked", value: total, icon: Layers, color: "text-violet-500" },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
