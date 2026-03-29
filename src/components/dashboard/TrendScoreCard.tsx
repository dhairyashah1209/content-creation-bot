"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalLink, Heart, MessageCircle, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type TrendTier = "viral" | "rising" | "steady" | "declining" | "dormant";

interface TrendPost {
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
  trendScore: string | null;
  trendTier: string | null;
  engagementVelocityScore: string | null;
  reachAmplificationScore: string | null;
  hashtagMomentumScore: string | null;
  recencyScore: string | null;
  engagementRate: string | null;
}

const TIER_STYLES: Record<TrendTier, { label: string; class: string }> = {
  viral: { label: "Viral", class: "bg-red-500 text-white hover:bg-red-600" },
  rising: { label: "Rising", class: "bg-orange-500 text-white hover:bg-orange-600" },
  steady: { label: "Steady", class: "bg-blue-500 text-white hover:bg-blue-600" },
  declining: { label: "Declining", class: "bg-gray-400 text-white hover:bg-gray-500" },
  dormant: { label: "Dormant", class: "bg-gray-300 text-gray-600 hover:bg-gray-400" },
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.7 ? "bg-green-500" : value >= 0.4 ? "bg-yellow-500" : "bg-gray-300";

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-7 text-right text-muted-foreground">{pct}%</span>
    </div>
  );
}

export function TrendScoreCard({ post }: { post: TrendPost }) {
  const tier = (post.trendTier ?? "dormant") as TrendTier;
  const tierStyle = TIER_STYLES[tier];
  const score = parseFloat(post.trendScore ?? "0");
  const engRate = post.engagementRate ? (parseFloat(post.engagementRate) * 100).toFixed(2) : null;

  const truncatedCaption = post.caption
    ? post.caption.length > 120
      ? post.caption.slice(0, 117) + "…"
      : post.caption
    : null;

  return (
    <Card className="flex flex-col gap-0 hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm truncate">
              @{post.authorHandle ?? "unknown"}
            </span>
            {post.authorIsVerified && (
              <span className="text-blue-500 text-xs">✓</span>
            )}
            {post.mediaType && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                {post.mediaType}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge className={`${tierStyle.class} text-[10px] px-2 py-0`}>
              {tierStyle.label}
            </Badge>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-lg font-bold tabular-nums cursor-help">
                  {score.toFixed(1)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="w-52">
                <div className="flex flex-col gap-1.5 py-1">
                  <p className="font-semibold text-xs mb-1">Score Breakdown</p>
                  <ScoreBar label="Eng. Velocity" value={parseFloat(post.engagementVelocityScore ?? "0")} />
                  <ScoreBar label="Reach Amplif." value={parseFloat(post.reachAmplificationScore ?? "0")} />
                  <ScoreBar label="Hashtag Momentum" value={parseFloat(post.hashtagMomentumScore ?? "0")} />
                  <ScoreBar label="Recency" value={parseFloat(post.recencyScore ?? "0")} />
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 flex flex-col gap-3">
        {truncatedCaption && (
          <p className="text-sm text-muted-foreground leading-relaxed">{truncatedCaption}</p>
        )}

        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Heart className="w-3.5 h-3.5" />
            {post.likeCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <MessageCircle className="w-3.5 h-3.5" />
            {post.commentCount.toLocaleString()}
          </span>
          {engRate && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              {engRate}%
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.postedAt), { addSuffix: true })}
          </span>
        </div>

        {post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.hashtags.slice(0, 5).map((tag) => (
              <span key={tag} className="text-[10px] text-blue-600 bg-blue-50 rounded px-1.5 py-0.5">
                {tag}
              </span>
            ))}
            {post.hashtags.length > 5 && (
              <span className="text-[10px] text-muted-foreground">
                +{post.hashtags.length - 5} more
              </span>
            )}
          </div>
        )}

        {post.postUrl && (
          <a
            href={post.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline w-fit"
          >
            View on Instagram <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
