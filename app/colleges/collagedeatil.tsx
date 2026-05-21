"use client";

import React, { useState } from "react";
import { posts } from "@/app/data/post_dummy_data"; // Modular list containing foreign keys
import { users } from "@/app/data/user_dummy_data"; // Imported to calculate enrolled count dynamically
import PostCard from "@/app/components/post/post-card";
import {
  FiMapPin,
  FiCalendar,
  FiUsers,
  FiStar,
  FiPlus,
  FiCheck,
} from "react-icons/fi";

interface CollegeDataSchema {
  id: string;
  name: string;
  logo: string;
  photo: string;
  banner: string;
  des: string;
  place: string;
  est: number;
  rating_coding: number;
  rating_startup: number;
  rating_peer_quality: number;
  rating_opportunities: number;
  rating_facultys: number;
  rating_campus_life: number;
  rating_overall: number;
}

interface CollegeDetailPageProps {
  renderdata: CollegeDataSchema;
}

export default function CollegeDetailPage({
  renderdata,
}: CollegeDetailPageProps) {
  const [isFollowing, setIsFollowing] = useState(false);

  // Derive acronym initials on the fly (e.g. "Newton School of Technology" -> "NST")
  const campusAcronym = renderdata.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  // 1. DYNAMIC DATA MATCHING (FOREIGN KEY FILTERING)
  // Look up posts belonging to this college using its target id
  const relevantCampusPosts = posts.filter(
    (post) => post.collage_id === renderdata.id,
  );

  // Count active users in the user database belonging to this college
  const dynamicStudentsCount = users.filter(
    (user) => user.college_id === renderdata.id,
  ).length;

  const ratingMetrics = [
    {
      label: "Coding Core",
      value: renderdata.rating_coding,
      color: "bg-[#4FD1C5]",
    },
    {
      label: "Startup Culture",
      value: renderdata.rating_startup,
      color: "bg-amber-400",
    },
    {
      label: "Peer Quality",
      value: renderdata.rating_peer_quality,
      color: "bg-purple-400",
    },
    {
      label: "Placements / Opps",
      value: renderdata.rating_opportunities,
      color: "bg-emerald-400",
    },
    {
      label: "Faculties",
      value: renderdata.rating_facultys,
      color: "bg-[#6C63FF]",
    },
    {
      label: "Campus Social Life",
      value: renderdata.rating_campus_life,
      color: "bg-rose-400",
    },
  ];

  return (
    <div className="w-full space-y-6 font-sans select-none">
      {/* CAMPUS PROFILE BANNER BLOCK */}
      <div className="w-full bg-[#0b0f17] rounded-2xl border border-[#6974892d] overflow-hidden shadow-xl">
        {/* Banner Frame Cover Image */}
        <div className="w-full h-48 relative bg-slate-900">
          <img
            src={renderdata.banner}
            alt={`${renderdata.name} Campus Banner`}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-transparent to-black/30" />
        </div>

        {/* Info Layout Header Row */}
        <div className="px-5 lg:px-6 pb-6 relative">
          {/* Overlapping Absolute Logo Frame */}
          <div className="absolute -top-12 left-5 lg:left-6 w-24 h-24 rounded-2xl border-4 border-[#0b0f17] bg-[#1a1e27] overflow-hidden shadow-2xl flex items-center justify-center p-1">
            <div className="w-full h-full rounded-xl bg-gradient-to-tr from-[#6C63FF] to-[#4FD1C5] flex items-center justify-center font-black text-xl text-white shadow-inner">
              {campusAcronym.slice(0, 2)}
            </div>
          </div>

          <div className="pt-16 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-bold tracking-wide text-white leading-tight">
                  {renderdata.name}
                </h1>
                <span className="text-[10px] font-mono font-bold bg-[#1e1b4b] text-[#818cf8] border border-[#312e81] px-1.5 py-0.5 rounded-md uppercase">
                  {campusAcronym}
                </span>
              </div>

              {/* Meta properties context logs row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-[12px] text-[#697489]">
                <div className="flex items-center gap-1.5">
                  <FiMapPin size={13} className="text-[#4FD1C5]" />
                  <span>{renderdata.place}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FiCalendar size={13} className="text-[#6C63FF]" />
                  <span>Est. {renderdata.est}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FiUsers size={13} className="text-[#818cf8]" />
                  <span>{dynamicStudentsCount} Enrolled Builders</span>
                </div>
              </div>
            </div>

            {/* Single Core Follow Action Group */}
            <div className="shrink-0">
              <button
                onClick={() => setIsFollowing(!isFollowing)}
                className={`h-9 px-5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-lg ${
                  isFollowing
                    ? "bg-[#1a1e27] text-emerald-400 border border-emerald-500/20"
                    : "bg-[#6C63FF] hover:bg-[#5a52f5] text-white shadow-[#6C63FF]/10"
                }`}
              >
                {isFollowing ? <FiCheck size={14} /> : <FiPlus size={14} />}
                <span>{isFollowing ? "Following" : "Follow"}</span>
              </button>
            </div>
          </div>

          {/* Description Block */}
          <div className="mt-6 pt-5 border-t border-[#1e293b]/60">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#697489] mb-2">
              About Institution
            </h3>
            <p className="text-[13.5px] text-gray-300 leading-relaxed max-w-4xl font-normal">
              {renderdata.des}
            </p>
          </div>

          {/* Performance Insights Progress Meter Lines */}
          <div className="mt-6 pt-5 border-t border-[#1e293b]/60">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#697489] mb-4">
              Performance Insights
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Overall Total Circle Score Card */}
              <div className="lg:col-span-3 flex flex-col items-center justify-center p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] text-center">
                <div className="flex items-center gap-1 text-amber-400 mb-0.5">
                  <FiStar size={14} className="fill-amber-400" />
                  <span className="text-xs font-bold font-mono tracking-wider">
                    OVERALL
                  </span>
                </div>
                <div className="text-3xl font-black text-white tracking-tight">
                  {renderdata.rating_overall}
                </div>
                <span className="text-[10px] text-white/30 font-medium mt-1">
                  out of 5.0 max score
                </span>
              </div>

              {/* Progress Track bars matching the granular scoring */}
              <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
                {ratingMetrics.map((metric) => {
                  const barPercentage = `${(metric.value / 10) * 100}%`;
                  return (
                    <div key={metric.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 font-medium">
                          {metric.label}
                        </span>
                        <span className="text-white font-semibold font-mono">
                          {metric.value}{" "}
                          <span className="text-white/20 text-[10px]">/10</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${metric.color} transition-all duration-500`}
                          style={{ width: barPercentage }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TIMELINE ACTIVITY STREAM FEED CONTAINER */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-[#818cf8] uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4FD1C5] animate-pulse" />
            <span>Campus Feed Activity ({relevantCampusPosts.length})</span>
          </h2>
        </div>

        {relevantCampusPosts.length > 0 ? (
          <div className="space-y-4">
            {relevantCampusPosts.map((postData) => (
              <PostCard key={postData.id} post={postData} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center text-sm text-white/30 bg-[#0B1120]/30 font-medium">
            No active project logs shared from this campus yet.
          </div>
        )}
      </div>
    </div>
  );
}
