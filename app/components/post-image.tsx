"use client";

import { useState } from "react";

/** Browser-sized private thumbnails, with the existing signed original as fallback. */
export default function PostImage({ postId, mediaId, original, alt, mime, carousel = false }: { postId: string; mediaId?: string; original: string; alt: string; mime: string | null; carousel?: boolean }) {
  const [failed, setFailed] = useState(false);
  const optimized = !failed && ["image/jpeg", "image/png", "image/webp"].includes(mime ?? "");
  const source = `/api/post-images/${postId}${mediaId ? `?media=${encodeURIComponent(mediaId)}&` : "?"}`;
  // eslint-disable-next-line @next/next/no-img-element -- Same-origin authenticated responsive image endpoint; no public optimizer cache.
  return <img alt={alt} className={carousel ? "post-gallery-image" : "block h-auto w-full max-w-none object-contain"} decoding="async" loading="lazy"
    style={carousel ? undefined : { width: "100%", height: "auto", maxWidth: "none", maxHeight: "none" }}
    src={optimized ? `${source}w=800` : original}
    srcSet={optimized ? `${source}w=480 480w, ${source}w=800 800w, ${source}w=1280 1280w` : undefined}
    sizes="(min-width: 1280px) 880px, (min-width: 768px) 800px, calc(100vw - 5.25rem)"
    onError={() => { if (optimized) setFailed(true); }} />;
}
