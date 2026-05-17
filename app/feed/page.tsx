"use client";

import React, { useState } from "react";
import Sidebar from "@/app/components/layout/sidebar";
import Rightsidebar from "@/app/components/layout/right-sidebar";
import Feed from "@/app/components/feed/feed-list";
import Navbar from "@/app/components/layout/navbar";

function Page() {
  return (
    <div>
      <Navbar />
      <div className="bg-bg text-font flex justify-center py-20">
        <div className="flex justify-between xl:w-2/3 w-full gap-5 mx-4">
          <Sidebar />
          <Feed />
          <Rightsidebar />
        </div>
      </div>
    </div>
  );
}

export default Page;
