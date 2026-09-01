/* eslint-disable @next/next/no-img-element -- Supabase Storage host is configured per deployment, so user avatars intentionally use the native element. */

import Image from "next/image";

export default function AvatarImage({ src, alt }: { src: string; alt: string }) {
  const configuredHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    : null;
  let optimized = false;
  try {
    optimized = Boolean(configuredHost && new URL(src).hostname === configuredHost);
  } catch {
    optimized = false;
  }

  if (!optimized) {
    return <img className="h-full w-full object-cover" alt={alt} src={src} loading="lazy" decoding="async" referrerPolicy="no-referrer" />;
  }

  return <Image alt={alt} className="object-cover" fill sizes="112px" src={src} />;
}
