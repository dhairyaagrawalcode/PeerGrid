"use client";

import React, { useState } from "react";
import Sidebar from "@/app/components/layout/sidebar";
import Rightsidebar from "@/app/components/layout/right-sidebar";
import Feed from "@/app/components/college/college-feed";
import Navbar from "@/app/components/layout/navbar";
import CreatePost from "@/app/components/feed/create-post";

function page() {
  const [openPostModal, setOpenPostModal] = useState(false);

  return (
    <div className="">
      <Navbar />
      <div className="bg-bg text-font flex justify-center py-20">
        <div className="flex justify-between xl:w-2/3 w-full gap-5 mx-4">
          <Sidebar />
          <Feed />
          <Rightsidebar />
        </div>
      </div>
      <button
        onClick={() => setOpenPostModal(true)}
        className="
            lg:flex
            fixed bottom-8 right-8 z-50
            font-[#12px]
            rounded-2xl
            bg-[#6C63FF]
            hover:bg-[#5b52ff]
            justify-center
           font-semibold
           py-2 px-3
            shadow-2xl shadow-[#6C63FF]/30
            transition-all duration-300
           
            text-font
          "
      >
        Create Post +
      </button>

      {/* Modal */}
      {openPostModal && (
        <CreatePost closeModal={() => setOpenPostModal(false)} />
      )}
    </div>
  );
}

export default page;
