"use client";

import { useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import type { PostMedia } from "@/app/types";
import PostImage from "./post-image";

export default function PostMediaGallery({ media, postId }: { media: PostMedia[]; postId: string }) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [firstAspectRatio, setFirstAspectRatio] = useState("4 / 3");

  useEffect(() => {
    const firstPhoto = scrollerRef.current?.querySelector<HTMLImageElement>(".post-gallery-image");
    if (!firstPhoto) return;
    const photo = firstPhoto;
    function captureFirstPhotoSize() {
      if (photo.naturalWidth > 0 && photo.naturalHeight > 0) {
        setFirstAspectRatio(`${photo.naturalWidth} / ${photo.naturalHeight}`);
      }
    }
    if (photo.complete) captureFirstPhotoSize();
    photo.addEventListener("load", captureFirstPhotoSize);
    return () => photo.removeEventListener("load", captureFirstPhotoSize);
  }, [media]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const element = scroller;
    let frame = 0;
    function update() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollerBounds = element.getBoundingClientRect();
        const center = scrollerBounds.left + scrollerBounds.width / 2;
        const slides = Array.from(element.children) as HTMLElement[];
        let closest = 0;
        let closestDistance = Number.POSITIVE_INFINITY;
        slides.forEach((slide, index) => {
          const bounds = slide.getBoundingClientRect();
          const distance = Math.abs(bounds.left + bounds.width / 2 - center);
          if (distance < closestDistance) {
            closestDistance = distance;
            closest = index;
          }
        });
        setActive(closest);
      });
    }
    element.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("scroll", update);
    };
  }, []);

  function move(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    const target = scroller?.children.item(Math.min(media.length - 1, Math.max(0, active + direction))) as HTMLElement | null;
    target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  return (
    <div aria-label={`${media.length} photos`} className="post-gallery" role="group">
      <ul className="post-gallery-scroller scrollbar-none" ref={scrollerRef} style={{ aspectRatio: firstAspectRatio }}>
        {media.map((item, index) => (
          <li className="post-gallery-slide" key={item.id}>
            {item.url ? (
              <PostImage
                alt={`${item.name || "Post photo"}, ${index + 1} of ${media.length}`}
                carousel
                mediaId={item.id === postId ? undefined : item.id}
                mime={item.mime}
                original={item.url}
                postId={postId}
              />
            ) : <div className="grid h-full min-w-48 place-items-center px-5 text-xs text-muted">Photo unavailable</div>}
          </li>
        ))}
      </ul>
      <span aria-live="polite" className="post-gallery-count">{active + 1} / {media.length}</span>
      {active > 0 && <button aria-label="Previous photo" className="post-gallery-arrow post-gallery-arrow-previous" onClick={() => move(-1)} type="button"><FiChevronLeft /></button>}
      {active < media.length - 1 && <button aria-label="Next photo" className="post-gallery-arrow post-gallery-arrow-next" onClick={() => move(1)} type="button"><FiChevronRight /></button>}
    </div>
  );
}
