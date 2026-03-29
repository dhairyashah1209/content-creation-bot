import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "drizzle-orm", "bullmq", "@upstash/redis"],
};

export default nextConfig;
