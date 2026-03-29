"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp } from "lucide-react";

interface HashtagStat {
  hashtag: string;
  postCount24h: number | null;
  postCount7d: number | null;
  momentumScore: string | null;
  recordedAt: string;
}

function MomentumBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.7 ? "#22c55e" : score >= 0.5 ? "#f97316" : "#94a3b8";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs tabular-nums w-8 text-right text-muted-foreground">{pct}%</span>
    </div>
  );
}

export function HashtagSparkline() {
  const { data, isLoading } = useQuery({
    queryKey: ["hashtag-stats"],
    queryFn: async () => {
      const res = await fetch("/api/hashtag-stats?limit=15");
      const json = await res.json();
      return json.stats as HashtagStat[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Hashtag Momentum</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hashtag data yet. Add topics and run a fetch.</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.slice(0, 8).map((s) => ({
    name: s.hashtag.replace(/^#/, ""),
    posts: s.postCount24h ?? 0,
    score: parseFloat(s.momentumScore ?? "0"),
  }));

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Hashtag Momentum (24h)
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex flex-col gap-4">
        {/* Bar chart of post volume */}
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={chartData} barCategoryGap="20%">
            <Bar dataKey="posts" radius={[3, 3, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.score >= 0.7 ? "#22c55e" : entry.score >= 0.5 ? "#f97316" : "#94a3b8"}
                />
              ))}
            </Bar>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                return (
                  <div className="bg-background border rounded-md shadow px-2 py-1 text-xs">
                    <span className="font-medium">#{payload[0].payload.name}</span>
                    <br />
                    {payload[0].value} posts / 24h
                  </div>
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Momentum bars */}
        <div className="flex flex-col gap-2">
          {data.slice(0, 8).map((stat) => (
            <div key={stat.hashtag} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium">{stat.hashtag}</span>
              <MomentumBar score={parseFloat(stat.momentumScore ?? "0")} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
