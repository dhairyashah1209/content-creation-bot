"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatTime } from "./chart-utils";

interface Snapshot {
  snapshotTime: string;
  velocityDelta: string | null;
}

export function VelocityDeltaChart({ snapshots }: { snapshots: Snapshot[] }) {
  const data = useMemo(
    () =>
      snapshots.map((s) => ({
        time: formatTime(s.snapshotTime),
        delta: s.velocityDelta ? parseFloat(s.velocityDelta) : 0,
      })),
    [snapshots]
  );

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Velocity Delta (Acceleration)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <ReferenceLine y={0} stroke="#666" />
          <Bar dataKey="delta" barSize={16}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.delta >= 0 ? "#22c55e" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
