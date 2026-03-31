"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Heart, MessageCircle, Users, CheckCircle2 } from "lucide-react";

interface Post {
  id: string;
  authorHandle: string | null;
  authorFollowers: number | null;
  authorIsVerified: boolean;
  caption: string | null;
  mediaType: string | null;
  postUrl: string | null;
  likeCount: number;
  commentCount: number;
  hashtags: string[];
  postedAt: string;
}

export function PostMetadataSidebar({ post }: { post: Post }) {
  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          @{post.authorHandle ?? "unknown"}
          {post.authorIsVerified && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Followers */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          {post.authorFollowers?.toLocaleString() ?? "—"} followers
        </div>

        {/* Engagement */}
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-pink-500" />
            {post.likeCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            {post.commentCount.toLocaleString()}
          </span>
        </div>

        {/* Media type */}
        {post.mediaType && (
          <Badge variant="outline" className="capitalize">
            {post.mediaType}
          </Badge>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="text-sm text-muted-foreground max-h-32 overflow-y-auto leading-relaxed">
            {post.caption}
          </p>
        )}

        {/* Hashtags */}
        {post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.hashtags.slice(0, 15).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
            {post.hashtags.length > 15 && (
              <span className="text-xs text-muted-foreground">+{post.hashtags.length - 15} more</span>
            )}
          </div>
        )}

        {/* Posted at */}
        <p className="text-xs text-muted-foreground">
          Posted {new Date(post.postedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>

        {/* Link */}
        {post.postUrl && (
          <a
            href={post.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View on Instagram
          </a>
        )}
      </CardContent>
    </Card>
  );
}
