import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "apify-client", "drizzle-orm", "bullmq", "@upstash/redis"],
};

export default nextConfig;
