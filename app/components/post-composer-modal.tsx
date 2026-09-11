"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { FiX } from "react-icons/fi";
import PostComposer from "./post-composer";
import { usePlatformProfile } from "./platform-profile-context";

export default function PostComposerModal() {
  const profile = usePlatformProfile();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  function close() {
    router.back();
  }

  function dismissFromBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const inside =
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom;
    if (!inside) close();
  }

  return (
    <dialog
      aria-labelledby="desktop-post-title"
      className="desktop-post-dialog"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={dismissFromBackdrop}
      ref={dialogRef}
    >
      <header className="desktop-post-dialog-header">
        <button className="desktop-post-dialog-cancel" onClick={close} type="button">
          Cancel
        </button>
        <h2 id="desktop-post-title">New post</h2>
        <button aria-label="Close new post" className="desktop-post-dialog-close" onClick={close} type="button">
          <FiX aria-hidden="true" />
        </button>
      </header>
      <PostComposer autoFocus profile={profile} />
    </dialog>
  );
}
