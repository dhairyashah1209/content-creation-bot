"use client";

import { Badge } from "@/components/ui/badge";
import { TIER_COLORS } from "./chart-utils";

interface Post {
  id: string;
  authorHandle: string | null;
  caption: string | null;
  trendScore: string | null;
  trendTier: string | null;
}

interface PostSelectorItemProps {
  post: Post;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function PostSelectorItem({ post, isSelected, onSelect }: PostSelectorItemProps) {
  const score = post.trendScore ? parseFloat(post.trendScore).toFixed(1) : "—";
  const tier = post.trendTier ?? "dormant";

  return (
    <button
      onClick={() => onSelect(post.id)}
      className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-transparent hover:bg-muted/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">
          @{post.authorHandle ?? "unknown"}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-mono">{score}</span>
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: TIER_COLORS[tier] }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground truncate mt-0.5">
        {post.caption?.slice(0, 80) ?? "No caption"}
      </p>
    </button>
  );
}
