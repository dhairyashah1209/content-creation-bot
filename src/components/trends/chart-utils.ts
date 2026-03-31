export const TIER_THRESHOLDS = [
  { value: 8.5, label: "Viral", color: "#ef4444" },
  { value: 6.5, label: "Rising", color: "#f97316" },
  { value: 4.0, label: "Steady", color: "#3b82f6" },
  { value: 2.0, label: "Declining", color: "#9ca3af" },
] as const;

export const TIER_COLORS: Record<string, string> = {
  viral: "#ef4444",
  rising: "#f97316",
  steady: "#3b82f6",
  declining: "#9ca3af",
  dormant: "#d1d5db",
};

export const COMPONENT_COLORS = {
  velocity: "#22c55e",
  momentum: "#f97316",
  recency: "#a855f7",
  format: "#64748b",
} as const;

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatShortTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
