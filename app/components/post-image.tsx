"use client";

import { useState } from "react";

/** Browser-sized private thumbnails, with the existing signed original as fallback. */
export default function PostImage({ postId, original, alt, mime }: { postId: string; original: string; alt: string; mime: string | null }) {
  const [failed, setFailed] = useState(false);
  const optimized = !failed && ["image/jpeg", "image/png", "image/webp"].includes(mime ?? "");
  const source = `/api/post-images/${postId}`;
  // eslint-disable-next-line @next/next/no-img-element -- Same-origin authenticated responsive image endpoint; no public optimizer cache.
  return <img alt={alt} className="max-h-[640px] w-full object-contain" decoding="async" loading="lazy"
    src={optimized ? `${source}?w=800` : original}
    srcSet={optimized ? `${source}?w=480 480w, ${source}?w=800 800w, ${source}?w=1280 1280w` : undefined}
    sizes="auto, (min-width: 1280px) 880px, (min-width: 768px) 800px, 100vw"
    onError={() => { if (optimized) setFailed(true); }} />;
}
