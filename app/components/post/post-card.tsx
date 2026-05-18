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
import { motion, AnimatePresence } from "framer-motion";

// Import your decoupled data tables
import { users } from "@/app/data/user_dummy_data";
import { colleges } from "@/app/data/collages_dummy_data";

interface AttachedDataItem {
  type: "image" | "video" | "doc" | "link";
  url: string;
  name?: string;
}

interface PostCardProps {
  post: {
    id: string;
    user_id: string; // Relational Foreign Key
    collage_id: string; // Relational Foreign Key
    content: string;
    tag_label: string;
    uploaded_time: string; // ISO Timestamp string
    likes: {
      is_liked: boolean;
      num_of_likes: number;
    };
    is_saved: boolean;
    is_following_user: boolean;
    attached_data: AttachedDataItem[];
  };
}

// Client-side helper to calculate relative "time ago" string from timestamp
function formatTimeAgo(isoString: string): string {
  try {
    const postDate = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - postDate.getTime();

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch (e) {
    return "Recent";
  }
}

export default function PostCard({ post }: PostCardProps) {
  // 1. RUNTIME RELATIONAL DATABASE LOOKUPS
  const author = users.find((u) => u.id === post.user_id);
  const studentCollege = colleges.find((c) => c.id === post.collage_id);

  // Derive display values safely with fallbacks
  const name = author ? author.name : "Anonymous Builder";
  const username = author ? author.username : "@anonymous";
  const profilePic = author ? author.profile_pic : "";
  const collegeName = studentCollege ? studentCollege.name : "Independent Hub";
  const courseContext = author
    ? `${author.course} · Year ${author.year}`
    : "Tech Builder";

  const logoText = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // 2. INTERNAL STATES
  const [liked, setLiked] = useState(post.likes.is_liked);
  const [likeCount, setLikeCount] = useState(post.likes.num_of_likes);
  const [saved, setSaved] = useState(post.is_saved);
  const [following, setFollowing] = useState(post.is_following_user);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // 3. MEDIA PROCESSING PAYLOADS
  // Split visual items (for slider/lightbox) from standalone links/docs
  const visualMedia = post.attached_data.filter(
    (item) => item.type === "image" || item.type === "video",
  );
  const utilityAttachments = post.attached_data.filter(
    (item) => item.type === "doc" || item.type === "link",
  );

  const handleLike = () => {
    if (liked) {
      setLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
    } else {
      setLiked(true);
      setLikeCount((prev) => prev + 1);
    }
  };

  const handleNextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (visualMedia.length > 0) {
      setMediaIndex((prev) => (prev + 1) % visualMedia.length);
    }
  };

  const handlePrevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (visualMedia.length > 0) {
      setMediaIndex(
        (prev) => (prev - 1 + visualMedia.length) % visualMedia.length,
      );
    }
  };

  return (
    <div className="w-full bg-[#0b0f17] text-white rounded-2xl border border-white/[0.05] p-4 lg:p-5 shadow-lg select-none relative overflow-hidden transition-all duration-200 hover:border-white/[0.08]">
      {/* CARD HEADER SECTION */}
      <div className="flex items-start justify-between gap-3 pb-3.5">
        <div className="flex items-start gap-3">
          {/* User Avatar Circle Frame */}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#6C63FF]/30 to-[#4FD1C5]/20 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            {profilePic ? (
              <img
                src={profilePic}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-[#818cf8]">
                {logoText}
              </span>
            )}
          </div>

          {/* Identity Matrix Meta Fields */}
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-bold tracking-wide text-white leading-none hover:underline cursor-pointer">
                {name}
              </span>
              <span className="text-xs text-[#697489] font-mono">
                {username}
              </span>
              {post.tag_label && (
                <span className="text-[9px] font-bold bg-white/[0.03] text-[#4FD1C5] border border-[#4fd1c5]/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider scale-95 origin-left">
                  {post.tag_label}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
              {courseContext}
            </p>
            <p className="text-[10px] text-[#697489] font-medium mt-0.5">
              {collegeName} · {formatTimeAgo(post.uploaded_time)}
            </p>
          </div>
        </div>

        {/* Dynamic Follow User Button Trigger */}
        <button
          onClick={() => setFollowing(!following)}
          className={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all duration-200 active:scale-95 cursor-pointer ${
            following
              ? "bg-white/[0.04] text-emerald-400 border border-emerald-500/10"
              : "bg-[#6C63FF]/10 hover:bg-[#6C63FF]/20 text-[#818cf8]"
          }`}
        >
          {following ? <FiUserCheck size={12} /> : <FiUserPlus size={12} />}
          <span>{following ? "Following" : "Follow"}</span>
        </button>
      </div>

      {/* BODY CONTENT TEXT SECTION */}
      <div className="text-[13.5px] text-gray-200 leading-relaxed font-normal whitespace-pre-wrap break-words pb-3">
        {post.content}
      </div>

      {/* RENDER DYNAMIC DOCUMENTS / REPO ATTACHMENT CHIPS */}
      {utilityAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-3.5">
          {utilityAttachments.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-300 hover:text-white transition-colors max-w-full"
            >
              {item.type === "doc" ? (
                <FiFileText size={14} className="text-[#818cf8] shrink-0" />
              ) : (
                <FiExternalLink size={14} className="text-[#4FD1C5] shrink-0" />
              )}
              <span className="truncate font-medium">
                {item.name || "Attached Asset"}
              </span>
            </a>
          ))}
        </div>
      )}

      {/* SLIDING INLINE IMAGE / VIDEO VISUAL MEDIA BOX CONTAINER */}
      {visualMedia.length > 0 && (
        <div className="w-full rounded-xl overflow-hidden border border-white/[0.04] bg-black/40 relative aspect-video group mb-4">
          <div
            className="w-full h-full cursor-zoom-in"
            onClick={() => setLightboxIndex(mediaIndex)}
          >
            {visualMedia[mediaIndex].type === "image" ? (
              <img
                src={visualMedia[mediaIndex].url}
                alt="Post Attachment File Preview"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
              />
            ) : (
              <video
                src={visualMedia[mediaIndex].url}
                controls
                className="w-full h-full object-contain bg-black"
              />
            )}
          </div>

          {/* Left/Right Carousel Controls Indicator */}
          {visualMedia.length > 1 && (
            <>
              <button
                onClick={handlePrevMedia}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-black/60 border border-white/5 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/80 z-10 active:scale-90"
              >
                <FiChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextMedia}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-black/60 border border-white/5 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/80 z-10 active:scale-90"
              >
                <FiChevronRight size={16} />
              </button>

              {/* Dynamic Bottom Dot Pips Track */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">
                {visualMedia.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      mediaIndex === idx
                        ? "w-3 bg-[#6C63FF]"
                        : "w-1.5 bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* FOOTER INTERACTIVE UTILITY ROW */}
      <div className="flex items-center justify-between border-t border-white/[0.04] pt-3 text-[#697489]">
        <div className="flex items-center gap-5">
          {/* Like Interaction Toggle Action */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
              liked ? "text-rose-500" : "hover:text-rose-400"
            }`}
          >
            {liked ? <AiFillHeart size={18} /> : <AiOutlineHeart size={18} />}
            <span className="font-mono">{likeCount}</span>
          </button>

          {/* Comments Section Shortcut Icon Placeholder */}
        
        </div>

        {/* Bookmark Trigger State Button */}
        <button
          onClick={() => setSaved(!saved)}
          className={`cursor-pointer transition-colors ${saved ? "text-[#818cf8]" : "hover:text-white"}`}
        >
          {saved ? <BsBookmarkFill size={15} /> : <BsBookmark size={15} />}
        </button>
      </div>

      {/* OVERLAY LIGHTBOX ZOOM MODAL ELEMENT */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxIndex(null)}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 md:p-10 backdrop-blur-md"
          >
            {/* Top Close Bar Option */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(null);
                }}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Central Slide Display Wrapper */}
            <div className="w-full max-w-5xl h-[75vh] flex items-center justify-center relative select-none">
              {/* Box Content Renderer */}
              <motion.div
                key={lightboxIndex}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 180 }}
                className="w-full h-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                {visualMedia[lightboxIndex].type === "image" ? (
                  <img
                    src={visualMedia[lightboxIndex].url}
                    alt="Lightbox High Res Content view"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  />
                ) : (
                  <video
                    src={visualMedia[lightboxIndex].url}
                    controls
                    autoPlay
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  />
                )}
              </motion.div>

              {/* Lightbox Horizontal Toggle Elements */}
              {visualMedia.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(
                        (prev) =>
                          (prev! - 1 + visualMedia.length) % visualMedia.length,
                      );
                    }}
                    className="absolute left-[-16px] md:left-[-60px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white flex items-center justify-center transition-all duration-200 z-10 active:scale-90 cursor-pointer"
                  >
                    <FiChevronLeft size={24} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(
                        (prev) => (prev! + 1) % visualMedia.length,
                      );
                    }}
                    className="absolute right-[-16px] md:right-[-60px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white flex items-center justify-center transition-all duration-200 z-10 active:scale-90 cursor-pointer"
                  >
                    <FiChevronRight size={24} />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
