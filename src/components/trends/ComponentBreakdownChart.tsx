"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { COMPONENT_COLORS, formatTime } from "./chart-utils";

interface Snapshot {
  snapshotTime: string;
  engagementVelocityScore: string;
  hashtagMomentumScore: string;
  recencyScore: string;
  formatMultiplier: string;
}

export function ComponentBreakdownChart({ snapshots }: { snapshots: Snapshot[] }) {
  const data = useMemo(
    () =>
      snapshots.map((s) => ({
        time: formatTime(s.snapshotTime),
        velocity: parseFloat(s.engagementVelocityScore),
        momentum: parseFloat(s.hashtagMomentumScore),
        recency: parseFloat(s.recencyScore),
        format: parseFloat(s.formatMultiplier),
      })),
    [snapshots]
  );

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Scoring Components</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="velocity" stroke={COMPONENT_COLORS.velocity} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="momentum" stroke={COMPONENT_COLORS.momentum} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="recency" stroke={COMPONENT_COLORS.recency} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="format" stroke={COMPONENT_COLORS.format} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
