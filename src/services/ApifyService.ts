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
const POST_ACTOR = "apify~instagram-post-scraper";
const MAX_POSTS_PER_RUN = 20;
// Max posts per individual post-scraper Apify run — keeps each run small and fast
const MAX_POSTS_PER_BATCH = 50;

export class ApifyService {
  private token: string;

  constructor() {
    this.token = process.env.APIFY_API_TOKEN!;
  }

  async fetchPostsByHashtag(hashtag: string, maxPosts = MAX_POSTS_PER_RUN): Promise<ApifyPost[]> {
    const tag = hashtag.replace(/^#/, "");

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

    const { data: runData } = await runRes.json() as {
      data: { id: string; defaultDatasetId: string; status: string };
    };

    const items = await this.pollAndFetch(runData.id, runData.defaultDatasetId, maxPosts);
    return items.filter((item) => item?.id);
  }

  /**
   * Refresh engagement metrics for specific posts by their Instagram URLs.
   * Uses the instagram-post-scraper actor which accepts direct post URLs.
   * Limited to MAX_POSTS_TO_REFRESH per call to control Apify credit usage.
   */
  /**
   * Refresh engagement metrics for specific posts by their Instagram URLs.
   * Uses the instagram-post-scraper actor which accepts direct post URLs.
   * Processes in batches of MAX_POSTS_PER_BATCH to keep individual Apify runs manageable.
   */
  async refreshPostsByUrl(
    postUrls: string[],
    batchSize = MAX_POSTS_PER_BATCH
  ): Promise<ApifyPost[]> {
    if (postUrls.length === 0) return [];

    const allResults: ApifyPost[] = [];

    for (let i = 0; i < postUrls.length; i += batchSize) {
      const batch = postUrls.slice(i, i + batchSize);

      const runRes = await fetch(
        `https://api.apify.com/v2/acts/${POST_ACTOR}/runs?token=${this.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ directUrls: batch }),
        }
      );

      if (!runRes.ok) {
        const text = await runRes.text();
        throw new Error(`Apify post-scraper run start failed: ${runRes.status} ${text}`);
      }

      const { data: runData } = await runRes.json() as {
        data: { id: string; defaultDatasetId: string; status: string };
      };

      const items = await this.pollAndFetch(runData.id, runData.defaultDatasetId, batch.length, 120_000);
      allResults.push(...items.filter((item) => item?.id));
    }

    return allResults;
  }

  /** Poll an actor run until it finishes, then return its dataset items. */
  private async pollAndFetch(
    runId: string,
    datasetId: string,
    limit: number,
    timeoutMs = 55_000
  ): Promise<ApifyPost[]> {
    const deadline = Date.now() + timeoutMs;
    let status = "RUNNING";

    while (status !== "SUCCEEDED" && status !== "FAILED" && status !== "ABORTED") {
      if (Date.now() > deadline) throw new Error(`Apify run ${runId} timed out`);
      await new Promise((r) => setTimeout(r, 3000));

      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${this.token}`
      );
      const { data } = await statusRes.json() as { data: { status: string } };
      status = data.status;
    }

    if (status !== "SUCCEEDED") throw new Error(`Apify run ${runId} ended with status: ${status}`);

    const datasetRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${this.token}&limit=${limit}`
    );

    if (!datasetRes.ok) throw new Error(`Apify dataset fetch failed: ${datasetRes.status}`);

    return datasetRes.json() as Promise<ApifyPost[]>;
  }

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
