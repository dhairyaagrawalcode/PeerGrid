"use client";

import { useEffect, useRef, useState, ChangeEvent } from "react";

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
  const docInputRef = useRef<HTMLInputElement>(null); // Replaced standard document ID with a clean React Ref

  const [links, setLinks] = useState<LinkItem[]>([{ label: "", url: "" }]);
  const [mediaPreview, setMediaPreview] = useState<MediaPreviewItem[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Daily Update");

  const categories = [
    "Daily Update",
    "Hackathon",
    "Project",
    "Fest",
    "Trip",
    "Startup",
  ];

  // Disables page scrolling when modal opens, enables it back on close
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

    // Remove completely empty rows
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
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-3">
      {/* Modal */}
      <div className="w-full max-w-2xl border border-white/10 bg-[#0B1120] rounded-[24px] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#6C63FF] flex items-center justify-center text-sm font-semibold text-white">
              D
            </div>
            <div>
              <h2 className="text-[15px] font-medium text-white leading-none">
                Dhairya Agrawal
              </h2>
              <p className="text-xs text-white/40 mt-1">Posting to PeerGrid</p>
            </div>
          </div>
          {/* Close button can be added here if needed */}
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {/* Main Input */}
          <textarea
            rows={7}
            placeholder="What are you building or learning?"
            className="w-full bg-transparent resize-none outline-none text-[16px] leading-7 text-white placeholder:text-white/25"
          />

          {/* Media Preview Grid */}
          {mediaPreview.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {mediaPreview.map((item, index) => (
                <div
                  key={index}
                  className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] group"
                >
                  <button
                    type="button"
                    onClick={() => removePreview(index)}
                    className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md text-white/70 hover:text-white hover:bg-black transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center justify-center"
                  >
                    ✕
                  </button>

                  {item.type === "image" && (
                    <img
                      src={item.preview}
                      alt="Upload preview"
                      className="w-full h-44 object-cover"
                    />
                  )}

                  {item.type === "video" && (
                    <video
                      src={item.preview}
                      controls
                      className="w-full h-44 object-cover"
                    />
                  )}

                  {item.type === "doc" && (
                    <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                      <div className="text-4xl">📄</div>
                      <p className="text-sm text-white/70 mt-3 break-all line-clamp-2">
                        {item.name}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Dynamic Link Inputs */}
          <div className="mt-4 space-y-2">
            {links.map((link, index) => (
              <div key={index} className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  value={link.label}
                  placeholder="Label"
                  onChange={(e) => updateLink(index, "label", e.target.value)}
                  className="col-span-4 h-10 px-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#6C63FF]/30"
                />
                <input
                  type="text"
                  value={link.url}
                  placeholder="https://"
                  onChange={(e) => updateLink(index, "url", e.target.value)}
                  className="col-span-8 h-10 px-3 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#4FD1C5]/30"
                />
              </div>
            ))}
          </div>

          {/* Categories Option Tags */}
          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`h-9 px-3 lg:px-4 rounded-full text-sm transition-all duration-200 ${
                  selectedCategory === category
                    ? "bg-[#6C63FF] text-white"
                    : "bg-white/[0.03] text-white/45 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-16 px-5 border-t border-white/10 flex items-center justify-between">
          {/* Hidden HTML File Inputs linked via React Refs */}
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

          {/* Action Trigger Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="h-10 px-3 md:px-4 rounded-xl text-sm text-white/55 hover:text-white hover:bg-white/[0.05] transition-all duration-200 flex items-center gap-2"
            >
              <span className="text-base">🖼️</span>
              <span className="hidden sm:inline">Photo</span>
            </button>

            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="h-10 px-3 md:px-4 rounded-xl text-sm text-white/55 hover:text-white hover:bg-white/[0.05] transition-all duration-200 flex items-center gap-2"
            >
              <span className="text-base">🎥</span>
              <span className="hidden sm:inline">Video</span>
            </button>

            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="h-10 px-3 md:px-4 rounded-xl text-sm text-white/55 hover:text-white hover:bg-white/[0.05] transition-all duration-200 flex items-center gap-2"
            >
              <span className="text-base">📄</span>
              <span className="hidden sm:inline">Doc</span>
            </button>
          </div>

          {/* Submission Group */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="h-10 px-3 lg:px-4 rounded-xl text-sm text-white/45 hover:text-white transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-3 lg:px-5 rounded-xl bg-[#6C63FF] hover:bg-[#5a52f5] text-sm font-medium text-white transition-all duration-200"
            >
              Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
