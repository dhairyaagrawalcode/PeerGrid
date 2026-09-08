"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FiTrash2 } from "react-icons/fi";
import { deleteSocialPost } from "@/app/actions/posts";
import ConfirmationModal from "./confirmation-modal";

export default function PostDeleteButton({ postId, hasAttachment }: { postId: string; hasAttachment: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function remove() {
    setError("");
    startTransition(async () => {
      const result = await deleteSocialPost(postId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return <>
    <button aria-label="Delete post" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger" onClick={() => { setError(""); setOpen(true); }} title="Delete post" type="button"><FiTrash2 /></button>
    {error && <p className="sr-only" role="alert">{error}</p>}
    <ConfirmationModal
      confirmLabel="Delete"
      description={error || (hasAttachment ? "This permanently removes your post and its attached photo, video, or file. This cannot be undone." : "This permanently removes your post. This cannot be undone.")}
      onCancel={() => { if (!pending) setOpen(false); }}
      onConfirm={remove}
      open={open}
      pending={pending}
      title="Delete this post?"
    />
  </>;
}
