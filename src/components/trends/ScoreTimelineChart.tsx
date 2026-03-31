"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { TIER_THRESHOLDS, formatTime } from "./chart-utils";

interface Snapshot {
  snapshotTime: string;
  trendScore: string;
}

export function ScoreTimelineChart({ snapshots }: { snapshots: Snapshot[] }) {
  const data = useMemo(
    () =>
      snapshots.map((s) => ({
        time: formatTime(s.snapshotTime),
        score: parseFloat(s.trendScore),
      })),
    [snapshots]
  );

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Trend Score Over Time</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
          <Tooltip />
          {TIER_THRESHOLDS.map((t) => (
            <ReferenceLine
              key={t.label}
              y={t.value}
              stroke={t.color}
              strokeDasharray="4 4"
              label={{ value: t.label, position: "right", fontSize: 10, fill: t.color }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="score"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
