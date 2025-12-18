import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ESLint runs separately in CI pipeline - don't block production builds
  // This allows deployment while lint issues are fixed incrementally
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TypeScript errors should still block builds for type safety
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    remotePatterns: [
      // Recipe source sites
      { protocol: 'https', hostname: '**.bbcgoodfood.com' },
      { protocol: 'https', hostname: '**.allrecipes.com' },
      { protocol: 'https', hostname: '**.deliciousmagazine.co.uk' },
      { protocol: 'https', hostname: '**.taste.com.au' },
      { protocol: 'https', hostname: '**.olivemagazine.com' },
      { protocol: 'https', hostname: '**.jamieoliver.com' },
      { protocol: 'https', hostname: '**.boredoflunch.com' },
      { protocol: 'https', hostname: '**.nytimes.com' },
      { protocol: 'https', hostname: '**.thebestblogrecipes.com' },
      { protocol: 'https', hostname: '**.halfbakedharvest.com' },
      // Common CDNs used by recipe sites
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: '**.imgix.net' },
      { protocol: 'https', hostname: '**.wp.com' },
      { protocol: 'https', hostname: '**.githubusercontent.com' },
      // Supabase storage
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },

  // Production optimizations
  poweredByHeader: false, // Remove X-Powered-By header for security

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },

  // Experimental features for better performance
  experimental: {
    // Optimize package imports for faster builds
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
};

export default nextConfig;
