"use client";

/* eslint-disable @next/next/no-img-element -- Preview URLs are local object URLs selected by the user. */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiFileText, FiImage, FiLoader, FiSend, FiUploadCloud, FiVideo, FiX } from "react-icons/fi";
import { createSocialPost } from "@/app/actions/posts";
import { createClient } from "@/app/lib/supabase/client";
import { compressPostImage } from "@/app/lib/compress-post-image";
import { initials } from "@/app/lib/format";
import { createUuid } from "@/app/lib/random-uuid";
import type { StudentProfile } from "@/app/types";
import AvatarImage from "./avatar-image";

const maxFileSize = 25 * 1024 * 1024;
const maxPhotos = 10;
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

export default function PostComposer({ profile, autoFocus = false }: { profile: StudentProfile; autoFocus?: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<"idle" | "uploading" | "publishing">("idle");

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function updateFiles(selected: File[]) {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const nextPreviews = selected.map((file) => fileKind(file) !== "document" ? URL.createObjectURL(file) : "");
    previewUrlsRef.current = nextPreviews.filter(Boolean);
    setPreviewUrls(nextPreviews);
    setFiles(selected);
  }

  function selectFiles(selectedList: FileList | null) {
    setError(null);
    setNotice(null);
    const selected = Array.from(selectedList ?? []);
    if (!selected.length) return;
    if (selected.length > maxPhotos) {
      updateFiles([]);
      return setError(`Choose up to ${maxPhotos} photos.`);
    }
    if (selected.some((file) => !fileKind(file))) {
      updateFiles([]);
      return setError("Choose an image, MP4/WebM/MOV video, PDF, Word, PowerPoint, Excel, or text file.");
    }
    if (selected.some((file) => file.size > maxFileSize)) {
      updateFiles([]);
      return setError("Attachments can be up to 25 MB.");
    }
    if (selected.length > 1 && selected.some((file) => fileKind(file) !== "image")) {
      updateFiles([]);
      return setError("Choose multiple photos together. Videos and documents can be posted one at a time.");
    }
    updateFiles(selected);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    setSubmissionStage(files.length ? "uploading" : "publishing");
    const form = new FormData(event.currentTarget);
    const body = String(form.get("body") ?? "").trim();
    const uploadedPaths: string[] = [];

    try {
      if (!body && !files.length) throw new Error("Write something or attach a file.");
      if (files.length) {
        const supabase = createClient();
        const attachments: Array<{ path: string; kind: "image" | "video" | "document"; name: string; mime: string; size: number }> = [];
        for (const file of files) {
          const kind = fileKind(file);
          if (!kind) throw new Error("That file type is not supported.");
          const uploadFile = await compressPostImage(file);
          const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "attachment";
          const path = `${profile.id}/${createUuid()}-${safeName}`;
          const { error: uploadError } = await supabase.storage
            .from("post-media")
            .upload(path, uploadFile, { contentType: uploadFile.type, upsert: false });
          if (uploadError) throw new Error("The attachment could not be uploaded. Please try again.");
          uploadedPaths.push(path);
          attachments.push({ path, kind, name: uploadFile.name, mime: uploadFile.type, size: uploadFile.size });
        }
        form.set("attachments", JSON.stringify(attachments));
      }

      setSubmissionStage("publishing");
      form.delete("attachment");
      const result = await createSocialPost(form);
      if (result.error) throw new Error(result.error);

      formRef.current?.reset();
      updateFiles([]);
      if (result.moderation === "held") {
        setNotice("Your post was submitted and is being reviewed before it appears in the feed.");
        return;
      }
      router.push("/feed");
      router.refresh();
    } catch (caught) {
      if (uploadedPaths.length) await createClient().storage.from("post-media").remove(uploadedPaths);
      setError(caught instanceof Error ? caught.message : "Could not publish your post.");
    } finally {
      setSubmitting(false);
      setSubmissionStage("idle");
    }
  }

  const kind = files[0] ? fileKind(files[0]) : null;

  return (
    <form aria-busy={submitting} className="post-composer surface overflow-hidden" onSubmit={submit} ref={formRef}>
      <div className="flex gap-3 p-4 sm:p-5">
        <div className="avatar !h-11 !w-11">
          {profile.avatar_url ? <AvatarImage alt={profile.full_name} src={profile.avatar_url} /> : initials(profile.full_name)}
        </div>
        <textarea
          aria-label="Post text"
          autoFocus={autoFocus}
          className="min-h-32 min-w-0 flex-1 resize-none bg-transparent pt-2 text-sm leading-6 text-font outline-none placeholder:text-muted"
          disabled={submitting}
          maxLength={5000}
          name="body"
          placeholder="What are you building or learning?"
        />
      </div>

      {files.length > 0 && (
        <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-line sm:mx-5">
          <div className="flex items-center justify-between border-b border-line bg-panel px-4 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{files.length > 1 ? `${files.length} photos selected` : files[0].name}</p><p className="mt-0.5 text-xs text-muted">{files.length > 1 ? `${files.length} of ${maxPhotos} photos` : readableSize(files[0].size)}</p></div>
            <button aria-label="Remove all attachments" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-card hover:text-font" disabled={submitting} onClick={() => updateFiles([])} type="button"><FiX /></button>
          </div>
          {kind === "image" && files.length > 1 && <ul aria-label="Selected photos" className="composer-gallery scrollbar-none">
            {files.map((file, index) => <li className="composer-gallery-slide" key={`${file.name}-${file.lastModified}-${index}`}>
              <img alt={`Selected photo ${index + 1} of ${files.length}`} src={previewUrls[index]} />
              <button aria-label={`Remove ${file.name}`} className="composer-gallery-remove" disabled={submitting} onClick={() => updateFiles(files.filter((_, current) => current !== index))} type="button"><FiX /></button>
            </li>)}
          </ul>}
          {kind === "image" && files.length === 1 && previewUrls[0] && <div className="flex min-h-40 items-center justify-center bg-black/20"><img alt="Selected post attachment" className="mx-auto h-auto max-h-[min(60vh,460px)] w-auto max-w-full object-contain" src={previewUrls[0]} /></div>}
          {kind === "video" && previewUrls[0] && <div className="flex min-h-40 items-center justify-center bg-black"><video className="mx-auto h-auto max-h-[min(60vh,460px)] w-auto max-w-full object-contain" controls playsInline preload="metadata" src={previewUrls[0]} /></div>}
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
            multiple
            name="attachment"
            onChange={(event) => { selectFiles(event.target.files); event.currentTarget.value = ""; }}
            type="file"
          />
        </div>
        <button className="button button-primary w-full !min-h-9 !px-4 sm:w-auto" disabled={submitting} type="submit">
          {submitting ? <><FiLoader className="animate-spin" />{submissionStage === "uploading" ? "Uploading…" : "Publishing…"}</> : <><FiSend /> Post</>}
        </button>
      </div>
      <p className="flex items-center gap-1.5 px-5 pb-4 text-[11px] text-muted"><FiUploadCloud /> Up to 10 photos, or one video/document. 25 MB each.</p>
    </form>
  );
}
