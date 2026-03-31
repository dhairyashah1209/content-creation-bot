"use client";

import { useMemo } from "react";
import { TIER_COLORS, formatShortTime } from "./chart-utils";

interface Snapshot {
  snapshotTime: string;
  trendTier: string;
}

interface Segment {
  tier: string;
  start: string;
  end: string;
  durationMs: number;
}

export function TierTransitionTimeline({ snapshots }: { snapshots: Snapshot[] }) {
  const segments = useMemo(() => {
    if (snapshots.length === 0) return [];
    const result: Segment[] = [];
    let current: Segment = {
      tier: snapshots[0].trendTier,
      start: snapshots[0].snapshotTime,
      end: snapshots[0].snapshotTime,
      durationMs: 0,
    };

    for (let i = 1; i < snapshots.length; i++) {
      const s = snapshots[i];
      if (s.trendTier === current.tier) {
        current.end = s.snapshotTime;
      } else {
        current.durationMs = new Date(current.end).getTime() - new Date(current.start).getTime();
        result.push(current);
        current = { tier: s.trendTier, start: s.snapshotTime, end: s.snapshotTime, durationMs: 0 };
      }
    }
    current.durationMs = new Date(current.end).getTime() - new Date(current.start).getTime();
    result.push(current);

    // Give single-point segments a minimum weight
    const totalMs = result.reduce((sum, s) => sum + Math.max(s.durationMs, 1), 0);
    return result.map((s) => ({
      ...s,
      weight: Math.max(s.durationMs, 1) / totalMs,
    }));
  }, [snapshots]);

  if (segments.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Tier Transitions</h3>
      <div className="flex rounded-md overflow-hidden h-8">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-xs font-medium text-white"
            style={{
              backgroundColor: TIER_COLORS[seg.tier] ?? "#d1d5db",
              width: `${(seg as { weight: number }).weight * 100}%`,
              minWidth: "24px",
            }}
            title={`${seg.tier}: ${formatShortTime(seg.start)} — ${formatShortTime(seg.end)}`}
          >
            {(seg as { weight: number }).weight > 0.12 ? seg.tier : ""}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">
          {formatShortTime(segments[0].start)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatShortTime(segments[segments.length - 1].end)}
        </span>
      </div>
    </div>
  );
}
