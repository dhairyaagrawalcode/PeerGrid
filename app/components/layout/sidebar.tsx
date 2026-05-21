"use client";

import React from "react";
import {
  IoHomeOutline,
  IoFolderOpenOutline,
  IoSettingsOutline,
} from "react-icons/io5";
import { RxPeople } from "react-icons/rx";
import { CiBookmark } from "react-icons/ci";
import { BiBuildings } from "react-icons/bi";
import Link from "next/link";
import { BsPostcardHeart } from "react-icons/bs";
import Image from "next/image";
import logo from "@/public/profilepic.png";

// 1. Move navigation links to a config array
const NAV_LINKS = [
  { name: "Home", redirectlink: "/", icon: <IoHomeOutline /> },
  { name: "Feed", redirectlink: "/feed", icon: <BsPostcardHeart /> },
  {
    name: "Explore Colleges",
    redirectlink: "/colleges",
    icon: <BiBuildings />,
  },
  { name: "Communities", redirectlink: "/community", icon: <RxPeople /> },
  {
    name: "Projects",
    redirectlink: "/projects",
    icon: <IoFolderOpenOutline />,
  },
  { name: "Saved", redirectlink: "/", icon: <CiBookmark /> },
];

// 2. Move skills list to an array
const SKILLS = ["React JS", "Next JS", "Python", "Typescript", "Node JS"];

// Reusable styling classes to avoid repeating walls of text
const CARD_BASE_CLASS =
  "bg-cardbg rounded-2xl border-[#6974892d] border-1 duration-500";

function Sidebar() {
  return (
    <div className="xl:w-1/5 xl:flex lg:w-2/7 lg:flex hidden flex-col gap-3 ">
      {/* --- PROFILE CARD --- */}

      <Link href="/profile">
        <div
          className={`${CARD_BASE_CLASS} p-3 flex flex-col hover:border-[#302f6a]`}
        >
          <div className="flex mb-3">
            <div className="bg-primary rounded-full w-10 h-10 flex items-center justify-center text-[12px] border-2 border-[#302f6a] overflow-hidden">
              <Image
                alt="AM"
                className="bg-red-500 w-full h-full object-cover"
                src={logo}
              />
            </div>
            <div className="ml-3">
              <div>Aarva Metha</div>
              <p className="text-[10px] text-[#697489]">
                B.Tech CSE · 2nd Year
              </p>
            </div>
          </div>

          <div className="flex gap-2 m-1">
            {["✓ NST", "BANGALORE"].map((tag) => (
              <div
                key={tag}
                className="border-1 border-primary text-primary px-3 py-1 rounded-xl text-[9px] font-semibold hover:cursor-pointer duration-300"
              >
                {tag}
              </div>
            ))}
          </div>

          <div className="flex justify-around mt-3">
            {[
              { value: 312, label: "Followers" },
              { value: 89, label: "Following" },
              { value: 5, label: "Projects" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <div className="text-[14px]">{stat.value}</div>
                <p className="text-[10px] text-[#697489]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Link>

      {/* --- ROUTES CARD --- */}

      <div className={`${CARD_BASE_CLASS} p-1`}>
        {NAV_LINKS.map((link) => (
          <Link key={link.name} href={link.redirectlink}>
            <div
              key={link.name}
              className="flex bg-cardbg text-[#697489] px-4 py-3 rounded-xl m-1 text-[13px] font-semibold hover:text-white hover:bg-[#1a1e27] hover:cursor-pointer duration-300"
            >
              <div className="flex items-center mr-2">{link.icon}</div>
              {link.name}
            </div>
          </Link>
        ))}
      </div>

      {/* --- SKILLS CARD --- */}

      <div className="bg-cardbg p-4 rounded-2xl border-[#6974892d] border-1">
        <div className="text-[#697489] text-[12px] mb-2">SKILLS</div>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((skill) => (
            <div
              key={skill}
              className="bg-[#1a1e27] text-[#697489] px-2 py-1 rounded-xl text-[10px] font-semibold hover:text-primary hover:cursor-pointer duration-300"
            >
              {skill}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
