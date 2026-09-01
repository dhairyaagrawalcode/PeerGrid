import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseRemotePatterns = supabaseUrl
  ? (() => {
      const parsed = new URL(supabaseUrl);
      const base = {
        protocol: parsed.protocol.replace(":", "") as "http" | "https",
        hostname: parsed.hostname,
        port: parsed.port,
      };
      return [
        { ...base, pathname: "/storage/v1/object/public/avatars/**" },
        { ...base, pathname: "/storage/v1/object/public/group-avatars/**" },
      ];
    })()
  : [];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: supabaseRemotePatterns,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
