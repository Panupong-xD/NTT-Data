import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  devIndicators: false,
  serverExternalPackages: ["got-scraping"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"]
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  }
};

export default nextConfig;
