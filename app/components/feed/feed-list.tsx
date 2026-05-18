import React from "react";
import { posts } from "@/app/data/post_dummy_data";
import PostCard from "@/app/components/post/post-card";
import CreatePostTrigger from "./CreatePostTrigger";

function FeedList() {
  return (
    <div className="w-full lg:w-5/7 xl:w-3/5 flex flex-col gap-3">
      <CreatePostTrigger />
      {/* 1. Added safety fallback check to ensure data exists */}
      {posts &&
        posts.map((singlePost) => (
          /* 2. Passing the whole object as a single 'post' prop */
          <PostCard key={singlePost.id} post={singlePost} />
        ))}
    </div>
  );
}

export default FeedList;
