import { ApifyClient } from "apify-client";

export interface ApifyPost {
  id: string;
  shortCode: string;
  url: string;
  type: "Image" | "Video" | "Sidecar"; // Sidecar = carousel
  caption: string | null;
  likesCount: number;
  commentsCount: number;
  videoViewCount: number | null;
  timestamp: string; // ISO 8601
  ownerUsername: string;
  ownerFullName: string | null;
  followersCount: number | null;
  isVerified: boolean;
  hashtags: string[];
  mentions: string[];
  displayUrl: string | null;
  videoUrl: string | null;
}

export class ApifyService {
  private client: ApifyClient;
  // Apify actor for scraping Instagram hashtags
  private static readonly HASHTAG_ACTOR = "apify/instagram-hashtag-scraper";
  private static readonly MAX_POSTS_PER_RUN = 10; // Keep within Vercel Hobby 60s timeout

  constructor() {
    this.client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
  }

  async fetchPostsByHashtag(hashtag: string, maxPosts = ApifyService.MAX_POSTS_PER_RUN): Promise<ApifyPost[]> {
    const tag = hashtag.replace(/^#/, "");

    const run = await this.client.actor(ApifyService.HASHTAG_ACTOR).call({
      hashtags: [tag],
      resultsLimit: maxPosts,
    });

    const { items } = await this.client
      .dataset(run.defaultDatasetId)
      .listItems({ limit: maxPosts });

    return (items as unknown as ApifyPost[]).filter((item) => item?.id);
  }

  async fetchPostsByMultipleHashtags(
    hashtags: string[],
    maxPerHashtag = 30
  ): Promise<Map<string, ApifyPost[]>> {
    const results = new Map<string, ApifyPost[]>();

    // Run hashtags in batches of 3 to avoid rate limits
    const batches: string[][] = [];
    for (let i = 0; i < hashtags.length; i += 3) {
      batches.push(hashtags.slice(i, i + 3));
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (tag) => {
          try {
            const posts = await this.fetchPostsByHashtag(tag, maxPerHashtag);
            results.set(tag, posts);
          } catch (err) {
            console.error(`[Apify] Failed to fetch hashtag ${tag}:`, err);
            results.set(tag, []);
          }
        })
      );
      // Brief pause between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return results;
  }

  /** Map Apify media type to our internal MediaType */
  static normalizeMediaType(apifyType: string): "image" | "video" | "carousel" | "reel" {
    switch (apifyType) {
      case "Video":
        return "reel";
      case "Sidecar":
        return "carousel";
      default:
        return "image";
    }
  }
}
