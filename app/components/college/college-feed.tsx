"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { colleges } from "@/app/data/collages_dummy_data";

export default function CollegesGrid() {
  return (
    <section className="w-full xl:w-3/5 lg:w-4/5 px-4 md:px-0 py-3">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#F5F7FA]">
          Explore Colleges
        </h1>

        <p className="mt-2 text-sm md:text-base text-[#F5F7FA]/50 max-w-2xl">
          Discover modern builder campuses through verified student reviews,
          startup culture, coding ecosystems, and real student experiences.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-10">
        <input
          type="text"
          placeholder="Search colleges, startup culture, coding..."
          className="w-full h-14 rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-sm md:text-base text-white placeholder:text-white/30 outline-none focus:border-[#6C63FF]/40 focus:bg-white/[0.05] transition-all duration-300"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {colleges.map((college) => (
          <motion.div
            initial={{ opacity: 0, y: 30 }} // Start low and invisible
            whileInView={{ opacity: 1, y: 0 }} // Animate to position when scrolled into view
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, ease: "easeIn" }}
            className="group overflow-hidden rounded-[32px] border border-white/10 bg-[#0B1120]/80 hover:border-[#6C63FF]/30 transition-all duration-500 "
            key={college.id}
          >
            <Link href={`/colleges/${college.id}`}>
              {/* Image */}

              <div className="relative h-[210px] overflow-hidden">
                <Image
                  src={college.images}
                  alt={college.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-all duration-700 opacity-90"
                />

                {/* Overlay */}

                {/* Logo */}
                <div className="absolute left-5 bottom-5 w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-[#111827] backdrop-blur-xl shadow-xl">
                  <Image
                    src={college.logo}
                    alt={college.name}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Overall Rating */}
                <div className="absolute right-5 bottom-5 px-3 py-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl flex items-center gap-2">
                  <span className="text-yellow-400 text-sm">★</span>

                  <span className="text-sm font-semibold text-white">
                    {college.rating_overall}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 md:p-6">
                {/* College Info */}
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-[#F5F7FA]">
                    {college.name}
                  </h2>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#F5F7FA]/50">
                    <span>{college.place}</span>

                    <span>•</span>

                    <span>Est. {college.est}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="mt-4 text-sm md:text-[12px] leading-relaxed text-[#F5F7FA]/55 line-clamp-3">
                  {college.des}
                </p>

                {/* Ratings */}
                <div className="grid grid-cols-3 gap-3 mt-6">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-2 text-center">
                    <p className="text-[14px] font-bold text-[#6C63FF]">
                      {college.rating_coding}
                    </p>

                    <span className="text-xs text-white/40">Coding</span>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-2 text-center">
                    <p className="text-[14px] font-bold text-[#4FD1C5]">
                      {college.rating_startup}
                    </p>

                    <span className="text-xs text-white/40">Startup</span>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-2 text-center">
                    <p className="text-[14px] font-bold text-[#F5F7FA]">
                      {college.students}
                    </p>

                    <span className="text-xs text-white/40">Students</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
