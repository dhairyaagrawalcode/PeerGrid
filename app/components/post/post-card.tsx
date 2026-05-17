"use client";

import React, { useState, useEffect } from "react";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { BiMessageRounded } from "react-icons/bi";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import {
  FiUserPlus,
  FiUserCheck,
  FiExternalLink,
  FiFileText,
  FiChevronLeft,
  FiChevronRight,
  FiX,
} from "react-icons/fi";
import { motion , AnimatePresence } from "framer-motion";

interface PostMedia {
  type: "image" | "video" | "doc";
  url: string;
  name?: string;
}

interface PostLink {
  label: string;
  url: string;
}

interface PostCardProps {
  post: {
    id: string;
    logo_text: string;
    name: string;
    college: string;
    course: string;
    year: string;
    time_uploaded: string;
    tag_label?: string;
    post_content: string;
    likes: { is_liked: boolean; count: number };
    is_saved: boolean;
    is_following?: boolean;
    media?: PostMedia[];
    links?: PostLink[];
  };
}

function PostCard({ post }: PostCardProps) {
  const [like, setLike] = useState(post.likes.is_liked);
  const [saved, setSaved] = useState(post.is_saved);
  const [likeNo, setLikeNo] = useState(post.likes.count);
  const [isFollowing, setIsFollowing] = useState(post.is_following || false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Lightbox Carousel State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const CONTENT_CHARACTER_LIMIT = 300;
  const shouldTruncate = post.post_content.length > CONTENT_CHARACTER_LIMIT;

  const displayedContent = isExpanded
    ? post.post_content
    : `${post.post_content.slice(0, CONTENT_CHARACTER_LIMIT)}...`;

  const visualMedia =
    post.media?.filter((m) => m.type === "image" || m.type === "video") || [];
  const documentMedia = post.media?.filter((m) => m.type === "doc") || [];

  function handleLikeToggle() {
    setLike(!like);
    setLikeNo((prev) => (like ? prev - 1 : prev + 1));
  }

  // FIX 1: Lock body scrolling when the lightbox carousel modal is open
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    // Cleanup fallback on unmount
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [lightboxIndex]);

  // Handle Keyboard Navigation for Carousel
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNextMedia();
      if (e.key === "ArrowLeft") handlePrevMedia();
      if (e.key === "Escape") setLightboxIndex(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex]);

  const handleNextMedia = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % visualMedia.length);
  };

  const handlePrevMedia = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex(
      (lightboxIndex - 1 + visualMedia.length) % visualMedia.length,
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="mx-2 md:mx-0 bg-[#121621] text-white p-5 rounded-2xl border border-white/5 font-sans shadow-xl  transition-all duration-300">
        {/* --- HEADER SECTION --- */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#4FD1C5] flex items-center justify-center font-bold text-sm text-white shadow-inner">
              {post.logo_text}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[15px] tracking-wide hover:text-[#6C63FF] transition-colors cursor-pointer">
                  {post.name}
                </span>
                <span className="text-[10px] font-bold bg-[#6C63FF]/10 text-[#818cf8] border border-[#6C63FF]/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {post.college}
                </span>
              </div>

              <p className="text-[12px] text-white/40 mt-0.5">
                {post.course} · {post.year} · {post.time_uploaded}
              </p>

              {post.tag_label && (
                <div className="mt-2">
                  <span className="inline-flex items-center text-[11px] font-medium text-[#4FD1C5] bg-[#4FD1C5]/10 border border-[#4FD1C5]/20 px-2.5 py-0.5 rounded-full">
                    {post.tag_label}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsFollowing(!isFollowing)}
            className={`h-8 px-3.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all duration-200 active:scale-95 ${
              isFollowing
                ? "bg-white/5 text-white/60 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                : "bg-[#6C63FF] text-white hover:bg-[#5a52f5]"
            }`}
          >
            {isFollowing ? (
              <>
                <FiUserCheck size={14} />
                <span>Following</span>
              </>
            ) : (
              <>
                <FiUserPlus size={14} />
                <span>Follow</span>
              </>
            )}
          </button>
        </div>

        {/* --- CONTENT SECTION --- */}
        <div className="text-[14px] text-white/90 leading-relaxed pl-0.5 pr-2 mb-4 whitespace-pre-wrap break-words">
          {shouldTruncate ? displayedContent : post.post_content}
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[#6C63FF] hover:text-[#5a52f5] font-medium text-xs ml-1.5 focus:outline-none transition-colors"
            >
              {isExpanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>

        {/* --- DYNAMIC VISUAL MEDIA GALLERY --- */}
        {visualMedia.length > 0 && (
          <div className="mb-4 rounded-xl overflow-hidden border border-white/5 bg-black/20">
            <div
              className={`grid gap-1 ${
                visualMedia.length === 1
                  ? "grid-cols-1"
                  : visualMedia.length === 2
                    ? "grid-cols-2 h-72"
                    : visualMedia.length === 3
                      ? "grid-cols-3 h-80"
                      : "grid-cols-2 h-96"
              }`}
            >
              {visualMedia.slice(0, 4).map((item, idx) => {
                const isThreeItemFirst = visualMedia.length === 3 && idx === 0;

                return (
                  <div
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className={`relative w-full h-full cursor-pointer overflow-hidden group select-none ${
                      isThreeItemFirst ? "col-span-2 row-span-2 h-80" : "h-full"
                    }`}
                  >
                    {item.type === "image" ? (
                      <img
                        src={item.url}
                        alt="Gallery Asset"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                      />
                    ) : (
                      <div className="relative w-full h-full pointer-events-none">
                        <video
                          src={item.url}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white text-xl pl-1 border border-white/10">
                            ▶
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-200" />

                    {visualMedia.length > 4 && idx === 3 && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center pointer-events-none">
                        <span className="text-xl font-bold tracking-wide text-white">
                          +{visualMedia.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- DYNAMIC DOCUMENT ATTACHMENTS --- */}
        {documentMedia.length > 0 && (
          <div className="mb-4 space-y-2">
            {documentMedia.map((doc, idx) => (
              <a
                key={idx}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 p-3.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl transition-all duration-200 group"
              >
                <div className="p-2 bg-[#6C63FF]/10 text-[#818cf8] border border-[#6C63FF]/20 rounded-lg group-hover:bg-[#6C63FF] group-hover:text-white transition-colors">
                  <FiFileText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate group-hover:text-white">
                    {doc.name || "Attached Document"}
                  </p>
                  <p className="text-[11px] text-white/30 truncate uppercase mt-0.5">
                    Click to download or view resource
                  </p>
                </div>
                <FiExternalLink
                  size={14}
                  className="text-white/30 group-hover:text-white/70 transition-colors mr-1"
                />
              </a>
            ))}
          </div>
        )}

        {/* --- LINK METADATA ATTACHMENTS --- */}
        {post.links && post.links.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2 pt-1">
            {post.links.map((link, idx) => {
              if (!link.url || !link.label) return null;
              return (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.02] border border-white/5 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-[#6C63FF]/10 hover:border-[#6C63FF]/30 transition-all duration-200"
                >
                  <span>🔗</span>
                  <span className="underline decoration-white/20 hover:decoration-[#6C63FF]">
                    {link.label}
                  </span>
                  <FiExternalLink size={12} className="text-white/30" />
                </a>
              );
            })}
          </div>
        )}

        {/* --- ACTION FOOTER BAR --- */}
        <div className="flex items-center justify-between border-t border-white/10 pt-3.5 mt-2">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLikeToggle}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold tracking-wide transition-all duration-200 active:scale-95 ${
                like
                  ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                  : "bg-white/[0.03] text-white/40 hover:text-white hover:bg-white/[0.07]"
              }`}
            >
              {like ? <AiFillHeart size={16} /> : <AiOutlineHeart size={16} />}
              <span>{likeNo}</span>
            </button>

          
          </div>

          <button
            onClick={() => setSaved(!saved)}
            className={`p-2 rounded-xl transition-all duration-200 active:scale-95 border ${
              saved
                ? "bg-[#6C63FF]/10 text-[#818cf8] border-[#6C63FF]/20"
                : "bg-white/[0.03] text-white/40 hover:text-white hover:bg-white/[0.07] border-transparent"
            }`}
          >
            {saved ? <BsBookmarkFill size={15} /> : <BsBookmark size={15} />}
          </button>
        </div>
      </div>

      {/* --- CAROUSEL MODAL LIGHTBOX OVERLAY --- */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Top Toolbar */}
            <div className="absolute top-4 left-5 right-5 flex items-center justify-between text-white/70 text-sm font-medium z-10">
              <div>
                {lightboxIndex + 1} / {visualMedia.length}
              </div>
              <button
                onClick={() => setLightboxIndex(null)}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors outline-none"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Carousel Active Media Frame */}
            <div
              className="relative max-w-5xl h-[80vh] md:h-[85vh] w-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Selector Arrow */}
              {visualMedia.length > 1 && (
                <button
                  onClick={handlePrevMedia}
                  className="absolute left-[-16px] md:left-[-60px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white flex items-center justify-center transition-all duration-200 z-10 active:scale-90"
                >
                  <FiChevronLeft size={24} />
                </button>
              )}

              {/* Media Content Display */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={lightboxIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  {visualMedia[lightboxIndex].type === "image" ? (
                    <img
                      src={visualMedia[lightboxIndex].url}
                      alt="Lightbox Item"
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl pointer-events-none"
                    />
                  ) : (
                    /* FIX 2: Made video component expand to match premium landscape/portrait image dimensions exactly */
                    <video
                      src={visualMedia[lightboxIndex].url}
                      controls
                      autoPlay
                      className="w-full h-full max-w-full max-h-full object-contain bg-black/40 rounded-lg shadow-2xl outline-none"
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Right Selector Arrow */}
              {visualMedia.length > 1 && (
                <button
                  onClick={handleNextMedia}
                  className="absolute right-[-16px] md:right-[-60px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white flex items-center justify-center transition-all duration-200 z-10 active:scale-90"
                >
                  <FiChevronRight size={24} />
                </button>
              )}
            </div>

            {/* Bottom Indicator Strips */}
            {visualMedia.length > 1 && (
              <div className="absolute bottom-6 flex items-center gap-1.5 z-10">
                {visualMedia.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(dotIdx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      lightboxIndex === dotIdx
                        ? "w-6 bg-[#6C63FF]"
                        : "w-1.5 bg-white/30"
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default PostCard;
