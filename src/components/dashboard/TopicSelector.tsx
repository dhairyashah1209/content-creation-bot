"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X, Hash } from "lucide-react";

interface TrackedTopic {
  id: string;
  value: string;
  topicType: string;
  isActive: boolean;
  lastFetchedAt: string | null;
}

interface TopicSelectorProps {
  selectedTopicId: string | null;
  onSelect: (id: string | null) => void;
}

export function TopicSelector({ selectedTopicId, onSelect }: TopicSelectorProps) {
  const [inputValue, setInputValue] = useState("");
  const client = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const res = await fetch("/api/topics");
      const json = await res.json();
      return json.topics as TrackedTopic[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (value: string) => {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, topicType: "hashtag" }),
      });
      return res.json();
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["topics"] });
      setInputValue("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/topics?id=${id}`, { method: "DELETE" });
    },
    onSuccess: (_, id) => {
      client.invalidateQueries({ queryKey: ["topics"] });
      if (selectedTopicId === id) onSelect(null);
    },
  });

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="fitness, travel, tech…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={addMutation.isPending || !inputValue.trim()}
        >
          <Plus className="w-4 h-4" />
          Track
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge
          variant={selectedTopicId === null ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => onSelect(null)}
        >
          All Topics
        </Badge>

        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full" />
          ))}

        {data?.map((topic) => (
          <Badge
            key={topic.id}
            variant={selectedTopicId === topic.id ? "default" : "outline"}
            className="cursor-pointer flex items-center gap-1 pr-1"
            onClick={() => onSelect(selectedTopicId === topic.id ? null : topic.id)}
          >
            {topic.value}
            <button
              className="ml-1 rounded-full hover:bg-white/20 p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                deleteMutation.mutate(topic.id);
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}

        {data?.length === 0 && !isLoading && (
          <span className="text-sm text-muted-foreground">No topics tracked yet.</span>
        )}
      </div>
    </div>
  );
}
