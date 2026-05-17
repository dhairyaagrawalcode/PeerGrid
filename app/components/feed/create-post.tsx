"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiX,
  FiImage,
  FiVideo,
  FiFileText,
  FiLink2,
  FiCheck,
} from "react-icons/fi";
import { motion } from "framer-motion";
import Image from "next/image";
import logo from "@/public/profilepic.jpeg";

// Defined interfaces for type safety
interface LinkItem {
  label: string;
  url: string;
}

interface MediaPreviewItem {
  file: File;
  type: "image" | "video" | "doc";
  preview: string;
  name: string;
}

interface CreatePostProps {
  closeModal: () => void;
}

export default function CreatePost({ closeModal }: CreatePostProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null); // Clean React Ref

  const [postContent, setPostContent] = useState("");
  const [links, setLinks] = useState<LinkItem[]>([{ label: "", url: "" }]);
  const [mediaPreview, setMediaPreview] = useState<MediaPreviewItem[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Daily Update");

  // Modern context tags for university builders
  const categories = [
    "Daily Update",
    "Hackathon",
    "Project",
    "Fest",
    "Trip",
    "Startup",
  ];

  // Disables background page scrolling when modal opens
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      mediaPreview.forEach((item) => {
        if (item.preview.startsWith("blob:")) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [mediaPreview]);

  const updateLink = (index: number, field: keyof LinkItem, value: string) => {
    const updated = [...links];
    updated[index][field] = value;

    // Remove completely empty rows dynamically
    const filtered = updated.filter(
      (item, i) =>
        i === 0 || item.label.trim() !== "" || item.url.trim() !== "",
    );

    const last = filtered[filtered.length - 1];

    // Add new row only if last row has content and limit is under 3
    if (
      filtered.length < 3 &&
      (last.label.trim() !== "" || last.url.trim() !== "")
    ) {
      filtered.push({ label: "", url: "" });
    }

    setLinks(filtered);
  };

  const handleFiles = (
    files: FileList | null,
    type: "image" | "video" | "doc",
  ) => {
    if (!files) return;
    const fileArray = Array.from(files);

    const previews = fileArray.map((file) => ({
      file,
      type,
      preview: type === "doc" ? "" : URL.createObjectURL(file), // Only generate object URLs for images/videos
      name: file.name,
    }));

    setMediaPreview((prev) => [...prev, ...previews]);
  };

  const removePreview = (index: number) => {
    const target = mediaPreview[index];
    if (target && target.preview.startsWith("blob:")) {
      URL.revokeObjectURL(target.preview); // Memory cleanup on deletion
    }
    setMediaPreview((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      {/* Premium Framer Motion Card Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-2xl border border-white/[0.06] bg-[#0B1120] rounded-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* --- HEADER PROFILE ARCHITECTURE --- */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/[0.06] shrink-0 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 overflow-hidden rounded-xl bg-gradient-to-tr from-[#6C63FF] to-[#4FD1C5] flex items-center justify-center text-xs font-bold text-white shadow-md shadow-[#6C63FF]/10">
              <Image
                alt="AM"
                className="bg-red-500 w-full h-full object-cover"
                src={logo}
              />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-white tracking-wide leading-tight">
                Dhairya Agrawal
              </h2>
              <p className="text-[11px] text-white/40 mt-0.5 font-medium">
                Posting to PeerGrid
              </p>
            </div>
          </div>
        </div>

        {/* --- SCROLLABLE CONTAINER COMPONENT --- */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Main Content Input Textarea */}
          <textarea
            rows={5}
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="What are you building, learning, or working on today?"
            className="w-full bg-transparent resize-none outline-none text-[14px] leading-relaxed text-white placeholder:text-white/20"
          />

          {/* High-End Clean Media Preview Grid */}
          {mediaPreview.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {mediaPreview.map((item, index) => (
                <div
                  key={index}
                  className="relative aspect-video rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.02] group select-none"
                >
                  <button
                    type="button"
                    onClick={() => removePreview(index)}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/80 backdrop-blur-md text-white/70 hover:text-white hover:bg-black transition-all flex items-center justify-center shadow-md opacity-100 sm:opacity-0 group-hover:opacity-100"
                  >
                    <FiX size={13} />
                  </button>

                  {item.type === "image" && (
                    <img
                      src={item.preview}
                      alt="Upload preview"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {item.type === "video" && (
                    <div className="w-full h-full bg-black/40 relative flex items-center justify-center">
                      <video
                        src={item.preview}
                        className="w-full h-full object-cover opacity-60"
                      />
                      <FiVideo size={20} className="absolute text-white/80" />
                    </div>
                  )}

                  {item.type === "doc" && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-white/[0.01]">
                      <FiFileText size={22} className="text-[#818cf8]" />
                      <p className="text-[11px] text-white/60 mt-2 truncate w-full px-2 font-medium">
                        {item.name}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Connected Dynamic Resource Links Panel */}
          <div className="space-y-2 pt-1">
            <label className="text-[10px] font-bold text-[#818cf8] uppercase tracking-wider block mb-1.5 opacity-80">
              Attached Project Resources & Repositories
            </label>
            {links.map((link, index) => (
              <div key={index} className="flex gap-2.5 items-center group">
                <div className="w-5 h-10 flex items-center justify-center text-white/20 group-hover:text-white/40 transition-colors">
                  <FiLink2 size={13} />
                </div>
                <div className="grid grid-cols-12 gap-2 flex-1">
                  <input
                    type="text"
                    value={link.label}
                    placeholder="Label (e.g. GitHub)"
                    onChange={(e) => updateLink(index, "label", e.target.value)}
                    className="col-span-4 h-10 px-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white placeholder:text-white/20 outline-none focus:border-[#6C63FF]/30 focus:bg-black/20 transition-all"
                  />
                  <input
                    type="text"
                    value={link.url}
                    placeholder="https://github.com/..."
                    onChange={(e) => updateLink(index, "url", e.target.value)}
                    className="col-span-8 h-10 px-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white placeholder:text-white/20 outline-none focus:border-[#4FD1C5]/30 focus:bg-black/20 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Categories Matrix System */}
          <div className="pt-2">
            <label className="text-[10px] font-bold text-[#4FD1C5] uppercase tracking-wider block mb-2.5 opacity-80">
              Select Post Context space
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((category) => {
                const isActive = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`h-8 px-3.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? "bg-[#6C63FF] text-white shadow-md shadow-[#6C63FF]/10"
                        : "bg-white/[0.02] text-white/40 border border-white/5 hover:text-white hover:bg-white/[0.05]"
                    }`}
                  >
                    {isActive && <FiCheck size={12} className="mr-0.5" />}
                    <span>{category}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- LOWER FOOTER ACTION OPERATORS --- */}
        <div className="h-16 px-6 border-t border-white/[0.06] flex items-center justify-between shrink-0 bg-white/[0.01]">
          {/* Native HTML Input Hub Triggers */}
          <input
            type="file"
            accept="image/*"
            multiple
            ref={imageInputRef}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files, "image")}
          />
          <input
            type="file"
            accept="video/*"
            multiple
            ref={videoInputRef}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files, "video")}
          />
          <input
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            multiple
            ref={docInputRef}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files, "doc")}
          />

          {/* Quick Media Upload Groups */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="h-9 px-3 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-2 font-medium cursor-pointer"
            >
              <FiImage size={14} className="text-[#4FD1C5]" />
              <span className="hidden sm:inline">Photo</span>
            </button>

            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="h-9 px-3 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-2 font-medium cursor-pointer"
            >
              <FiVideo size={14} className="text-[#6C63FF]" />
              <span className="hidden sm:inline">Video</span>
            </button>

            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="h-9 px-3 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-2 font-medium cursor-pointer"
            >
              <FiFileText size={14} className="text-[#818cf8]" />
              <span className="hidden sm:inline">Document</span>
            </button>
          </div>

          {/* Execution Form Control Elements */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="h-9 px-4 rounded-xl text-xs font-semibold text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!postContent.trim() && mediaPreview.length === 0}
              className="h-9 px-5 rounded-xl bg-[#6C63FF] hover:bg-[#5a52f5] disabled:opacity-30 disabled:hover:bg-[#6C63FF] disabled:cursor-not-allowed text-xs font-semibold text-white transition-all shadow-md shadow-[#6C63FF]/5 active:scale-98 cursor-pointer"
            >
              Publish
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
