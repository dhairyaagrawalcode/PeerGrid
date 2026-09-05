"use client";

/* eslint-disable @next/next/no-img-element -- Preview URLs are local object URLs selected by the user. */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiFileText, FiImage, FiLoader, FiSend, FiUploadCloud, FiVideo, FiX } from "react-icons/fi";
import { createSocialPost } from "@/app/actions/posts";
import { createClient } from "@/app/lib/supabase/client";
import { compressPostImage } from "@/app/lib/compress-post-image";
import { initials } from "@/app/lib/format";
import type { StudentProfile } from "@/app/types";
import AvatarImage from "./avatar-image";

const maxFileSize = 25 * 1024 * 1024;
const documentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

function fileKind(file: File): "image" | "video" | "document" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (documentTypes.has(file.type)) return "document";
  return null;
}

function readableSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
}

export default function PostComposer({ profile }: { profile: StudentProfile }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<"idle" | "uploading" | "publishing">("idle");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function updateFile(selected: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreview = selected && fileKind(selected) !== "document"
      ? URL.createObjectURL(selected)
      : null;
    previewUrlRef.current = nextPreview;
    setPreviewUrl(nextPreview);
    setFile(selected);
  }

  function selectFile(selected: File | null) {
    setError(null);
    setNotice(null);
    if (!selected) return updateFile(null);
    if (!fileKind(selected)) {
      updateFile(null);
      return setError("Choose an image, MP4/WebM/MOV video, PDF, Word, PowerPoint, Excel, or text file.");
    }
    if (selected.size > maxFileSize) {
      updateFile(null);
      return setError("Attachments can be up to 25 MB.");
    }
    updateFile(selected);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    setSubmissionStage(file ? "uploading" : "publishing");
    const form = new FormData(event.currentTarget);
    const body = String(form.get("body") ?? "").trim();
    let uploadedPath = "";

    try {
      if (!body && !file) throw new Error("Write something or attach a file.");
      if (file) {
        const kind = fileKind(file);
        if (!kind) throw new Error("That file type is not supported.");
        const uploadFile = await compressPostImage(file);
        const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "attachment";
        uploadedPath = `${profile.id}/${crypto.randomUUID()}-${safeName}`;
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(uploadedPath, uploadFile, { contentType: uploadFile.type, upsert: false });
        if (uploadError) throw new Error("The attachment could not be uploaded. Please try again.");
        form.set("attachmentPath", uploadedPath);
        form.set("attachmentKind", kind);
        form.set("attachmentName", uploadFile.name);
        form.set("attachmentMime", uploadFile.type);
      }

      setSubmissionStage("publishing");
      form.delete("attachment");
      const result = await createSocialPost(form);
      if (result.error) {
        if (uploadedPath) await createClient().storage.from("post-media").remove([uploadedPath]);
        throw new Error(result.error);
      }

      formRef.current?.reset();
      updateFile(null);
      if (result.moderation === "held") {
        setNotice("Your post was submitted and is being reviewed before it appears in the feed.");
        return;
      }
      router.push("/feed");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not publish your post.");
    } finally {
      setSubmitting(false);
      setSubmissionStage("idle");
    }
  }

  const kind = file ? fileKind(file) : null;

  return (
    <form aria-busy={submitting} className="surface overflow-hidden" onSubmit={submit} ref={formRef}>
      <div className="flex gap-3 p-4 sm:p-5">
        <div className="avatar !h-11 !w-11">
          {profile.avatar_url ? <AvatarImage alt={profile.full_name} src={profile.avatar_url} /> : initials(profile.full_name)}
        </div>
        <textarea
          aria-label="Post text"
          className="min-h-32 min-w-0 flex-1 resize-none bg-transparent pt-2 text-sm leading-6 text-font outline-none placeholder:text-muted"
          disabled={submitting}
          maxLength={5000}
          name="body"
          placeholder="What are you building or learning?"
        />
      </div>

      {file && (
        <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-line sm:mx-5">
          <div className="flex items-center justify-between border-b border-line bg-panel px-4 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{file.name}</p><p className="mt-0.5 text-xs text-muted">{readableSize(file.size)}</p></div>
            <button aria-label="Remove attachment" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-card hover:text-font" disabled={submitting} onClick={() => updateFile(null)} type="button"><FiX /></button>
          </div>
          {kind === "image" && previewUrl && <img alt="Selected post attachment" className="max-h-[460px] w-full object-contain" src={previewUrl} />}
          {kind === "video" && previewUrl && <video className="max-h-[460px] w-full bg-black" controls preload="metadata" src={previewUrl} />}
          {kind === "document" && <div className="flex items-center gap-3 p-5 text-sm text-muted"><FiFileText className="text-subtle" size={24} /> Document ready to upload</div>}
        </div>
      )}

      {error && <p className="mx-4 mb-4 rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm text-danger sm:mx-5" role="alert">{error}</p>}
      {notice && <p className="mx-4 mb-4 rounded-xl border border-line bg-panel p-3 text-sm text-subtle sm:mx-5" role="status">{notice}</p>}
      {submitting && <div className="mx-4 mb-4 sm:mx-5" role="status"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-subtle"><FiLoader className="animate-spin" />{submissionStage === "uploading" ? "Uploading attachment…" : "Publishing post…"}</div><div className="h-1 overflow-hidden rounded-full bg-line"><div className="h-full w-2/3 animate-pulse rounded-full bg-primary" /></div></div>}

      <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted sm:justify-start">
          <label aria-disabled={submitting} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${submitting ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-card hover:text-font"}`} htmlFor="attachment"><FiImage className="text-secondary" /> Photo</label>
          <label aria-disabled={submitting} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${submitting ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-card hover:text-font"}`} htmlFor="attachment"><FiVideo className="text-subtle" /> Video</label>
          <label aria-disabled={submitting} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${submitting ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-card hover:text-font"}`} htmlFor="attachment"><FiFileText /> Document</label>
          <input
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
            className="sr-only"
            disabled={submitting}
            id="attachment"
            name="attachment"
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </div>
        <button className="button button-primary w-full !min-h-9 !px-4 sm:w-auto" disabled={submitting} type="submit">
          {submitting ? <><FiLoader className="animate-spin" />{submissionStage === "uploading" ? "Uploading…" : "Publishing…"}</> : <><FiSend /> Post</>}
        </button>
      </div>
      <p className="flex items-center gap-1.5 px-5 pb-4 text-[11px] text-muted"><FiUploadCloud /> One attachment, up to 25 MB.</p>
    </form>
  );
}
