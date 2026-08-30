import { FiCheck, FiUserPlus } from "react-icons/fi";
import { followUser, unfollowUser } from "@/app/actions/follows";

export default function FollowControls({ currentId, targetId, isFollowing, compact = false }: { currentId: string; targetId: string; isFollowing: boolean; compact?: boolean }) {
  if (currentId === targetId) return null;
  const classes = compact ? "button !min-h-9 !px-3 !text-xs" : "button";
  return (
    <form action={isFollowing ? unfollowUser : followUser}>
      <input name="targetId" type="hidden" value={targetId} />
      <button className={`${classes} ${isFollowing ? "button-secondary" : "button-primary"}`} title={isFollowing ? "Click to unfollow" : "Follow this student"} type="submit">
        {isFollowing ? <><FiCheck /> Following</> : <><FiUserPlus /> Follow</>}
      </button>
    </form>
  );
}
