import PostComposer from "@/app/components/post-composer";
import { requireStudent } from "@/app/lib/auth";

export default async function PostPage() {
  const { profile } = await requireStudent();
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6"><p className="eyebrow">Create</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">New post</h1><p className="mt-2 text-sm text-muted">Share an update, photo, video, or document.</p></div>
      <PostComposer profile={profile} />
    </div>
  );
}
