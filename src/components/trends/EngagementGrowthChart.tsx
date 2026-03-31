"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatTime } from "./chart-utils";

interface Snapshot {
  snapshotTime: string;
  likesAtSnapshot: number | null;
  commentsAtSnapshot: number | null;
}

export function EngagementGrowthChart({ snapshots }: { snapshots: Snapshot[] }) {
  const data = useMemo(
    () =>
      snapshots.map((s) => ({
        time: formatTime(s.snapshotTime),
        likes: s.likesAtSnapshot ?? 0,
        comments: s.commentsAtSnapshot ?? 0,
      })),
    [snapshots]
  );

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Engagement Growth</h3>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="likes" fill="#f472b6" barSize={20} />
          <Line yAxisId="right" type="monotone" dataKey="comments" stroke="#60a5fa" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
