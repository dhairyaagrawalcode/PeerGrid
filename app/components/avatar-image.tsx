/* eslint-disable @next/next/no-img-element -- Supabase Storage host is configured per deployment, so user avatars intentionally use the native element. */

export default function AvatarImage({ src, alt }: { src: string; alt: string }) {
  return <img className="h-full w-full object-cover" alt={alt} src={src} loading="lazy" decoding="async" referrerPolicy="no-referrer" />;
}

