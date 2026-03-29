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

const HASHTAG_ACTOR = "apify~instagram-hashtag-scraper";
const MAX_POSTS_PER_RUN = 20; // Safe max for Vercel Hobby 60s timeout (~25-40s to scrape)

export class ApifyService {
  private token: string;

  constructor() {
    this.token = process.env.APIFY_API_TOKEN!;
  }

  async fetchPostsByHashtag(hashtag: string, maxPosts = MAX_POSTS_PER_RUN): Promise<ApifyPost[]> {
    const tag = hashtag.replace(/^#/, "");

    // Start actor run
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${HASHTAG_ACTOR}/runs?token=${this.token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashtags: [tag], resultsLimit: maxPosts }),
      }
    );

    if (!runRes.ok) {
      const text = await runRes.text();
      throw new Error(`Apify run start failed: ${runRes.status} ${text}`);
    }

    const { data: runData } = await runRes.json() as { data: { id: string; defaultDatasetId: string; status: string } };
    const runId = runData.id;

    // Poll until finished (max 55s)
    const deadline = Date.now() + 55_000;
    let status = runData.status;

    while (status !== "SUCCEEDED" && status !== "FAILED" && status !== "ABORTED") {
      if (Date.now() > deadline) throw new Error("Apify run timed out after 55s");
      await new Promise((r) => setTimeout(r, 3000));

      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${this.token}`
      );
      const { data } = await statusRes.json() as { data: { status: string; defaultDatasetId: string } };
      status = data.status;
    }

    if (status !== "SUCCEEDED") throw new Error(`Apify run ended with status: ${status}`);

    // Fetch dataset items
    const datasetRes = await fetch(
      `https://api.apify.com/v2/datasets/${runData.defaultDatasetId}/items?token=${this.token}&limit=${maxPosts}`
    );

    if (!datasetRes.ok) throw new Error(`Apify dataset fetch failed: ${datasetRes.status}`);

    const items = await datasetRes.json() as ApifyPost[];
    return items.filter((item) => item?.id);
  }

  async fetchPostsByMultipleHashtags(
    hashtags: string[],
    maxPerHashtag = 30
  ): Promise<Map<string, ApifyPost[]>> {
    const results = new Map<string, ApifyPost[]>();

    for (const tag of hashtags) {
      try {
        const posts = await this.fetchPostsByHashtag(tag, maxPerHashtag);
        results.set(tag, posts);
      } catch (err) {
        console.error(`[Apify] Failed to fetch hashtag ${tag}:`, err);
        results.set(tag, []);
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
