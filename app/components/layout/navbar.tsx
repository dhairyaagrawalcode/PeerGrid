"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FiSearch,
  FiMessageSquare,
  FiBell,
  FiChevronDown,
  FiUser,
  FiSettings,
  FiLogOut,
  FiShield,
  FiFileText,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdown drawers cleanly when clicking outside their active dimensions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchFocused(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Professional Mock Data Matrix for Campus Search Layouts
  const mockSuggestions = [
    {
      name: "Arjun Sharma",
      type: "Student",
      detail: "B.Tech AI ML · 1st Year (NST)",
    },
    {
      name: "Priya Kapoor",
      type: "Student",
      detail: "B.Tech AI ML · 3rd Year (SST)",
    },
    {
      name: "Newton School of Technology",
      type: "College",
      detail: "Digital Campus · Delhi NCR",
    },
    {
      name: "Scaler School of Technology",
      type: "College",
      detail: "Electronic City Campus · Bengaluru",
    },
  ];

  const filteredSuggestions = mockSuggestions.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="bg-[#0B1120] text-white border-b border-white/[0.05] h-16 fixed top-0 right-0 w-full z-50 font-sans backdrop-blur-md bg-opacity-95 shadow-md flex items-center select-none">
      <div className=" xl:w-2/3 mx-auto px-5 w-full flex items-center justify-between gap-5">
        {/* --- LEFT: BRANDING & LOGO ASSEMBLY --- */}
        <div className="flex items-center gap-2 shrink-0 cursor-pointer group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6C63FF] to-[#4FD1C5] flex items-center justify-center shadow-lg shadow-[#6C63FF]/10">
            <span className="font-black text-base text-white tracking-tighter">
              P
            </span>
          </div>
          <span className="text-[17px] font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent group-hover:text-white transition-colors block">
            Peer<span className="text-[#6C63FF]">Grid</span>
          </span>
        </div>

        {/* --- MIDDLE: LINKEDIN-STYLE LIVE FILTER SEARCH ENGINE --- */}
        <div
          ref={searchRef}
          className="flex-1 max-w-md relative hidden md:block"
        >
          <div
            className={`w-full flex items-center h-10 px-3.5 bg-white/[0.02] border rounded-xl transition-all duration-200 ${
              searchFocused
                ? "border-[#6C63FF] bg-black/40 ring-4 ring-[#6C63FF]/5"
                : "border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.04]"
            }`}
          >
            <FiSearch
              className={`mr-2.5 transition-colors duration-200 ${searchFocused ? "text-[#6C63FF]" : "text-white/30"}`}
              size={16}
            />
            <input
              type="text"
              placeholder="Search students, campuses, domains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              className="w-full bg-transparent outline-none border-none text-[13.5px] text-white placeholder:text-white/20"
            />
          </div>

          {/* Floating Dropdown Results Card Box */}
          <AnimatePresence>
            {searchFocused && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.99 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="absolute left-0 right-0 top-[46px] bg-[#0E1726] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[350px] overflow-y-auto custom-scrollbar"
              >
                <div className="px-4 py-2.5 text-[10px] font-bold text-[#818cf8] uppercase tracking-wider bg-white/[0.01] border-b border-white/[0.04]">
                  Matching Queries
                </div>

                {filteredSuggestions.length > 0 ? (
                  <div className="py-1">
                    {filteredSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-2.5 hover:bg-white/[0.02] cursor-pointer flex items-center justify-between transition-colors border-b border-white/[0.02] last:border-0"
                      >
                        <div className="min-w-0 pr-3">
                          <p className="text-[13px] font-medium text-white/90 truncate">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-white/40 truncate mt-0.5">
                            {item.detail}
                          </p>
                        </div>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border shrink-0 ${
                            item.type === "College"
                              ? "bg-[#4FD1C5]/10 text-[#4FD1C5] border-[#4FD1C5]/20"
                              : "bg-[#6C63FF]/10 text-[#818cf8] border-[#6C63FF]/20"
                          }`}
                        >
                          {item.type}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-white/30 tracking-wide">
                    No matching accounts, clubs, or profiles located
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- RIGHT: UTILITY MESSAGES, NOTIFICATIONS & PROFILE PANELS --- */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Active Peer Messages Hub */}
          <button className="w-9 h-9 rounded-xl bg-white/[0.01] hover:bg-white/[0.05] border border-white/[0.05] flex items-center justify-center text-white/60 hover:text-white relative transition-all active:scale-95">
            <FiMessageSquare size={17} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#4FD1C5] ring-2 ring-[#0B1120]" />
          </button>

          {/* Campus Updates Notifications Feed */}
          <button className="w-9 h-9 rounded-xl bg-white/[0.01] hover:bg-white/[0.05] border border-white/[0.05] flex items-center justify-center text-white/60 hover:text-white relative transition-all active:scale-95">
            <FiBell size={17} />
            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-[#0B1120]" />
          </button>

          {/* Dynamic Interactive Account Dropdown Trigger */}
          <div ref={profileRef} className="relative ml-0.5">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-1.5 p-1 pr-2 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/[0.05] transition-all duration-200"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#4FD1C5] flex items-center justify-center font-bold text-[11px] text-white shadow-inner">
                DA
              </div>
              <FiChevronDown
                size={13}
                className={`text-white/30 transition-transform duration-200 ${profileDropdownOpen ? "rotate-180 text-white/80" : ""}`}
              />
            </button>

            {/* Account Settings Dropdown Card Frame */}
            <AnimatePresence>
              {profileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="absolute right-0 top-[44px] w-56 bg-[#0E1726] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50 py-1.5"
                >
                  {/* Account Metadata Segment Summary Header */}
                  <div className="px-4 py-2.5 border-b border-white/[0.04] mb-1.5">
                    <p className="text-[13px] font-semibold text-white/90">
                      Dhairya Agrawal
                    </p>
                    <p className="text-[11px] text-white/40 truncate mt-0.5 font-medium">
                      dhairya@peergrid.com
                    </p>
                  </div>

                  {/* Operational Settings Options Routes */}
                  <button className="w-full px-4 py-2 text-left text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.02] flex items-center gap-2.5 transition-colors">
                    <FiUser size={14} className="text-white/30" />
                    <span>My Profile</span>
                  </button>

                  <button className="w-full px-4 py-2 text-left text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.02] flex items-center gap-2.5 transition-colors">
                    <FiFileText size={14} className="text-white/30" />
                    <span>Portfolio & Resumes</span>
                  </button>

                  <button className="w-full px-4 py-2 text-left text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.02] flex items-center gap-2.5 transition-colors">
                    <FiSettings size={14} className="text-white/30" />
                    <span>Account Settings</span>
                  </button>

                  <button className="w-full px-4 py-2 text-left text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.02] flex items-center gap-2.5 transition-colors">
                    <FiShield size={14} className="text-white/30" />
                    <span>Privacy Centre</span>
                  </button>

                  <div className="h-px bg-white/[0.04] my-1.5" />

                  {/* System Account Log Out Escape Route */}
                  <button className="w-full px-4 py-2 text-left text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 flex items-center gap-2.5 transition-colors">
                    <FiLogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
