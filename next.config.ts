import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  devIndicators: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"]
  },
  typescript: { ignoreBuildErrors: false }
};

export default nextConfig;
