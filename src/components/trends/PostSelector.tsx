"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { PostSelectorItem } from "./PostSelectorItem";
import { TIER_COLORS } from "./chart-utils";

const TIERS = ["all", "viral", "rising", "steady", "declining", "dormant"] as const;

interface PostSelectorProps {
  topicId: string | null;
  selectedPostId: string | null;
  onSelectPost: (id: string) => void;
}

interface Post {
  id: string;
  authorHandle: string | null;
  caption: string | null;
  trendScore: string | null;
  trendTier: string | null;
}

export function PostSelector({ topicId, selectedPostId, onSelectPost }: PostSelectorProps) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useMemo(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const params = new URLSearchParams({ limit: "100" });
  if (topicId) params.set("topicId", topicId);
  if (tierFilter !== "all") params.set("tier", tierFilter);
  if (debouncedSearch) params.set("search", debouncedSearch);

  const { data, isLoading } = useQuery({
    queryKey: ["trends-selector", topicId, tierFilter, debouncedSearch],
    queryFn: async () => {
      const res = await fetch(`/api/trends?${params}`);
      const json = await res.json();
      return json.posts as Post[];
    },
  });

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search by author or caption..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TIERS.map((t) => (
          <Badge
            key={t}
            variant={tierFilter === t ? "default" : "outline"}
            className="cursor-pointer text-xs capitalize"
            onClick={() => setTierFilter(t)}
            style={
              tierFilter === t && t !== "all"
                ? { backgroundColor: TIER_COLORS[t], borderColor: TIER_COLORS[t] }
                : undefined
            }
          >
            {t}
          </Badge>
        ))}
      </div>

      <ScrollArea className="h-[400px]">
        <div className="flex flex-col gap-0.5">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          {data?.map((post) => (
            <PostSelectorItem
              key={post.id}
              post={post}
              isSelected={selectedPostId === post.id}
              onSelect={onSelectPost}
            />
          ))}
          {data?.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No posts found.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
