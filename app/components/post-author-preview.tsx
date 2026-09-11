import Link from "next/link";
import { FiMessageCircle } from "react-icons/fi";
import { startConversation } from "@/app/actions/messages";
import { initials } from "@/app/lib/format";
import type { SocialPost } from "@/app/types";
import AvatarImage from "./avatar-image";
import FollowControls from "./follow-controls";

export default function PostAuthorPreview({
  post,
  own,
}: {
  post: SocialPost;
  own: boolean;
}) {
  const profileHref = own ? "/profile" : `/students/${post.author.username}`;
  return (
    <aside className="post-author-preview-card mt-.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            className="block truncate text-base font-black "
            href={profileHref}
          >
            {post.author.full_name}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted">
            @{post.author.username}
          </p>
        </div>
        <Link
          className="avatar !h-14 !w-14 shrink-0 !rounded-full"
          href={profileHref}
        >
          {post.author.avatar_url ? (
            <AvatarImage
              alt={post.author.full_name}
              src={post.author.avatar_url}
            />
          ) : (
            initials(post.author.full_name)
          )}
        </Link>
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-subtle">
        {post.author.current_status ||
          post.author.program ||
          post.author.campus?.name ||
          "Verified PeerGrid student"}
      </p>
      {!own && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <FollowControls
            compact
            currentId="viewer"
            isFollowing={post.viewer_follows_author}
            targetId={post.author_id}
          />
          <form action={startConversation}>
            <input name="otherUserId" type="hidden" value={post.author_id} />
            <button
              className="button button-secondary w-full !min-h-9 !px-3 !text-xs"
              type="submit"
            >
              <FiMessageCircle /> Message
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
