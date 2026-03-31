"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreTimelineChart } from "./ScoreTimelineChart";
import { ComponentBreakdownChart } from "./ComponentBreakdownChart";
import { EngagementGrowthChart } from "./EngagementGrowthChart";
import { VelocityDeltaChart } from "./VelocityDeltaChart";
import { TierTransitionTimeline } from "./TierTransitionTimeline";
import { PostMetadataSidebar } from "./PostMetadataSidebar";

interface TimelinePanelProps {
  postId: string;
}

export function TimelinePanel({ postId }: TimelinePanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["snapshots", postId],
    queryFn: async () => {
      const res = await fetch(`/api/snapshots?postId=${postId}`);
      if (!res.ok) throw new Error("Failed to fetch snapshots");
      return res.json() as Promise<{ post: Record<string, unknown>; snapshots: Record<string, unknown>[] }>;
    },
    enabled: !!postId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[280px] w-full" />
        <Skeleton className="h-[240px] w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Failed to load snapshot data.</p>;
  }

  const { post, snapshots } = data;

  if (snapshots.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No snapshots recorded yet for this post.</p>;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      <div className="space-y-6">
        <ScoreTimelineChart snapshots={snapshots as any} />
        <ComponentBreakdownChart snapshots={snapshots as any} />
        <EngagementGrowthChart snapshots={snapshots as any} />
        <VelocityDeltaChart snapshots={snapshots as any} />
        <TierTransitionTimeline snapshots={snapshots as any} />
      </div>
      <div className="order-first lg:order-last">
        <PostMetadataSidebar post={post as any} />
      </div>
    </div>
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
