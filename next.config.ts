import type { NextConfig } from 'next';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseHostname = (() => {
  if (!supabaseUrl) {
    return null;
  }

  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  experimental: {
    webpackBuildWorker: false
  },
  images: supabaseHostname
    ? {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: supabaseHostname,
            pathname: '/storage/v1/object/public/**'
          }
        ]
      }
    : undefined
};

export default nextConfig;
