import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseRemotePattern = supabaseUrl
  ? (() => {
      const parsed = new URL(supabaseUrl);
      return {
        protocol: parsed.protocol.replace(":", "") as "http" | "https",
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: "/storage/v1/object/public/avatars/**",
      };
    })()
  : null;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: supabaseRemotePattern ? [supabaseRemotePattern] : [],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
