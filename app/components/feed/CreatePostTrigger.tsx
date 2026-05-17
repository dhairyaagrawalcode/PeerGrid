"use client";

import React, { useState } from "react";
import { FiImage, FiVideo, FiFileText } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import CreatePost from "./create-post"; // Adjust this import path to match your folder structure

export default function CreatePostTrigger() {
  const [openPostModal, setOpenPostModal] = useState(false);

  return (
    <>
      {/* --- PROFESSIONAL LINKEDIN-STYLE FEED TRIGGER CARD --- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className=" bg-[#121621] text-white p-4 rounded-2xl border border-white/[0.05] shadow-lg font-sans select-none mx-2 md:mx-0 ">
          <div className="flex items-center gap-3">
            {/* Student Profile Avatar Placeholder */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#4FD1C5] flex items-center justify-center font-bold text-xs text-white shadow-md shrink-0">
              DA
            </div>

            {/* Simulated Input Field Button */}
            <button
              onClick={() => setOpenPostModal(true)}
              className="flex-1 h-10 px-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.04] text-left text-xs sm:text-sm text-white/30 transition-all duration-200 outline-none cursor-pointer"
            >
              What are you building , or working on today?
            </button>
          </div>

          {/* Quick Shortcut Buttons beneath the input */}
          <div className="flex items-center gap-1 mt-3 pt-2.5 border-t border-white/[0.04]">
            <button
              onClick={() => setOpenPostModal(true)}
              className="flex-1 h-9 px-2 rounded-xl text-xs font-semibold text-white/50 hover:text-white hover:bg-white/[0.03] transition-colors flex items-center justify-center gap-2"
            >
              <FiImage size={15} className="text-[#4FD1C5]" />
              <span>Photo</span>
            </button>

            <button
              onClick={() => setOpenPostModal(true)}
              className="flex-1 h-9 px-2 rounded-xl text-xs font-semibold text-white/50 hover:text-white hover:bg-white/[0.03] transition-colors flex items-center justify-center gap-2"
            >
              <FiVideo size={15} className="text-[#6C63FF]" />
              <span>Video</span>
            </button>

            <button
              onClick={() => setOpenPostModal(true)}
              className="flex-1 h-9 px-2 rounded-xl text-xs font-semibold text-white/50 hover:text-white hover:bg-white/[0.03] transition-colors flex items-center justify-center gap-2"
            >
              <FiFileText size={15} className="text-[#818cf8]" />
              <span>Document</span>
            </button>
          </div>
        </div>
      </motion.div>
      {/* --- RENDER TARGET PUBLISHING MODAL PANEL --- */}
      <AnimatePresence>
        {openPostModal && (
          <CreatePost closeModal={() => setOpenPostModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
