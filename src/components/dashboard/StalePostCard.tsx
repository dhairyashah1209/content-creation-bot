"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StalePost {
  id: string;
  authorHandle: string | null;
  authorIsVerified: boolean;
  caption: string | null;
  mediaType: string | null;
  postUrl: string | null;
  likeCount: number;
  commentCount: number;
  hashtags: string[];
  postedAt: string;
}

export function StalePostCard({ post }: { post: StalePost }) {
  const truncatedCaption = post.caption
    ? post.caption.length > 100
      ? post.caption.slice(0, 97) + "…"
      : post.caption
    : null;

  return (
    <Card className="flex flex-col opacity-60 border-dashed">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm truncate text-muted-foreground">
              @{post.authorHandle ?? "unknown"}
            </span>
            {post.mediaType && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize text-muted-foreground">
                {post.mediaType}
              </Badge>
            )}
          </div>
          <Badge variant="secondary" className="text-[10px] px-2 py-0 shrink-0">
            Stale
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 flex flex-col gap-3">
        {truncatedCaption && (
          <p className="text-xs text-muted-foreground leading-relaxed">{truncatedCaption}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {post.likeCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            {post.commentCount.toLocaleString()}
          </span>
          <span className="ml-auto">
            {formatDistanceToNow(new Date(post.postedAt), { addSuffix: true })}
          </span>
        </div>

        {post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.hashtags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                {tag}
              </span>
            ))}
            {post.hashtags.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{post.hashtags.length - 4}</span>
            )}
          </div>
        )}

        {post.postUrl && (
          <a
            href={post.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-fit"
          >
            View on Instagram <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
