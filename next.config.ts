import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
