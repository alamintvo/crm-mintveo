import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize bundle size
  experimental: {
    optimizePackageImports: ['lucide-react', 'radix-ui'],
  },
  // Disable source maps in production to reduce bundle size
  productionBrowserSourceMaps: false,
  // Enable compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
