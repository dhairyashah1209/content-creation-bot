"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, TrendingUp, BarChart2, Archive, Hash } from "lucide-react";

interface StatsResponse {
  totalPosts: number;
  viral: number;
  rising: number;
  avgScore: string;
  staleCount: number;
}

interface StatsBarProps {
  topicId: string | null;
}

export function StatsBar({ topicId }: StatsBarProps) {
  const { data, isLoading } = useQuery<StatsResponse>({
    queryKey: ["stats", topicId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (topicId) params.set("topicId", topicId);
      const res = await fetch(`/api/stats?${params}`);
      return res.json();
    },
  });

  const stats = [
    { label: "Total Posts",     value: data?.totalPosts ?? 0,             icon: Hash,       color: "text-emerald-500" },
    { label: "Viral Posts",     value: data?.viral ?? 0,                  icon: Flame,      color: "text-red-500" },
    { label: "Rising Posts",    value: data?.rising ?? 0,                 icon: TrendingUp, color: "text-orange-500" },
    { label: "Avg Trend Score", value: data?.avgScore ?? "—",             icon: BarChart2,  color: "text-blue-500" },
    { label: "Stale Posts",     value: data?.staleCount ?? 0,             icon: Archive,    color: "text-muted-foreground" },
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
