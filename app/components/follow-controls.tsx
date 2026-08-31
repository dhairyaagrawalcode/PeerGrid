"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FiCheck, FiUserPlus } from "react-icons/fi";
import { followUser, unfollowUser } from "@/app/actions/follows";

export default function FollowControls({ currentId, targetId, isFollowing, compact = false }: { currentId: string; targetId: string; isFollowing: boolean; compact?: boolean }) {
  const [following, setFollowing] = useState(isFollowing);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (currentId === targetId) return null;
  const classes = compact ? "button !min-h-9 !px-3 !text-xs" : "button";
  function toggle() {
    if (pending) return;
    const previous = following;
    setFollowing(!previous);
    startTransition(async () => {
      const result = previous ? await unfollowUser(targetId) : await followUser(targetId);
      if (result?.error) {
        setFollowing(previous);
        return;
      }
      if (!compact) router.refresh();
    });
  }
  return (
    <button aria-pressed={following} className={`${classes} ${following ? "button-secondary" : "button-primary"}`} disabled={pending} onClick={toggle} title={following ? "Click to unfollow" : "Follow this student"} type="button">
      {following ? <><FiCheck /> Following</> : <><FiUserPlus /> Follow</>}
    </button>
  );
}
