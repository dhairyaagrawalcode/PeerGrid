"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/app/lib/auth";
import { moderateContent } from "@/app/lib/moderation";

export type CreatePostResult = { success?: boolean; error?: string; moderation?: "published" | "held" };
export type DeletePostResult = { success?: boolean; error?: string };
export type UpdatePostResult = { success?: boolean; error?: string; moderation?: "published" | "held" };

const allowedKinds = new Set(["image", "video", "document"]);
const allowedImageMimes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const allowedVideoMimes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const allowedDocumentMimes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PendingMedia = { path: string; kind: string; name: string; mime: string; size: number };

function mediaMimeMatchesKind(media: PendingMedia) {
  if (media.kind === "image") return allowedImageMimes.has(media.mime);
  if (media.kind === "video") return allowedVideoMimes.has(media.mime);
  if (media.kind === "document") return allowedDocumentMimes.has(media.mime);
  return false;
}

function readMedia(formData: FormData): PendingMedia[] | null {
  const encoded = String(formData.get("attachments") ?? "");
  if (encoded) {
    if (encoded.length > 32_000) return null;
    try {
      const parsed = JSON.parse(encoded) as unknown;
      if (!Array.isArray(parsed)) return null;
      return parsed.map((item) => {
        const media = item as Partial<PendingMedia>;
        return {
          path: String(media.path ?? "").trim(),
          kind: String(media.kind ?? "").trim(),
          name: String(media.name ?? "").trim(),
          mime: String(media.mime ?? "").trim(),
          size: Number(media.size ?? 0),
        };
      });
    } catch {
      return null;
    }
  }
  const path = String(formData.get("attachmentPath") ?? "").trim();
  if (!path) return [];
  return [{
    path,
    kind: String(formData.get("attachmentKind") ?? "").trim(),
    name: String(formData.get("attachmentName") ?? "").trim(),
    mime: String(formData.get("attachmentMime") ?? "").trim(),
    size: Number(formData.get("attachmentSize") ?? 0),
  }];
}

export async function createSocialPost(formData: FormData): Promise<CreatePostResult> {
  const { supabase, user } = await requireStudent();
  const body = String(formData.get("body") ?? "").trim();
  const media = readMedia(formData);

  if (!media) return { error: "The attachment details are incomplete." };
  if (!body && !media.length) return { error: "Write something or attach a file." };
  if (body.length > 5000) return { error: "Posts can contain up to 5,000 characters." };
  const moderation = moderateContent(body);
  if (moderation.status === "rejected") return { error: "This post violates PeerGrid's community rules and cannot be published." };

  if (media.length > 10) return { error: "Choose up to 10 photos." };
  if (media.length > 1 && media.some((item) => item.kind !== "image")) {
    return { error: "Multiple attachments must all be photos." };
  }
  if (new Set(media.map((item) => item.path)).size !== media.length) return { error: "Duplicate attachments are not allowed." };
  for (const item of media) {
    if (!item.path.startsWith(`${user.id}/`)) return { error: "Invalid attachment path." };
    if (!allowedKinds.has(item.kind) || !mediaMimeMatchesKind(item) || !item.name || item.name.length > 255 || item.mime.length > 120 || !Number.isSafeInteger(item.size) || item.size < 1 || item.size > 25 * 1024 * 1024) {
      return { error: "The attachment details are incomplete." };
    }
  }
  const first = media[0] ?? null;

  const postPayload = {
    author_id: user.id,
    body,
    attachment_path: first?.path ?? null,
    attachment_kind: first?.kind ?? null,
    attachment_name: first?.name ?? null,
    attachment_mime: first?.mime ?? null,
    attachment_size: first?.size ?? null,
  };
  let { data: created, error } = await supabase.from("social_posts").insert(postPayload).select("id, moderation_status").single();

  // Older deployments created attachment_size before granting insert access to it.
  // Retry the same post using the original attachment columns until the gallery
  // migration is deployed; the ordered post_media rows still retain the size.
  if (error && first && ["42501", "42703", "PGRST204"].includes(error.code)) {
    const legacyPayload = {
      author_id: postPayload.author_id,
      body: postPayload.body,
      attachment_path: postPayload.attachment_path,
      attachment_kind: postPayload.attachment_kind,
      attachment_name: postPayload.attachment_name,
      attachment_mime: postPayload.attachment_mime,
    };
    ({ data: created, error } = await supabase.from("social_posts").insert(legacyPayload).select("id, moderation_status").single());
  }

  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) {
      return { error: "The social posts migration has not been applied yet." };
    }
    if (error.message.includes("RATE_LIMIT_EXCEEDED")) {
      return { error: "You are posting too quickly. Wait a few minutes and try again." };
    }
    console.error("[PeerGrid] social post insert failed", { code: error.code });
    return { error: "Your post could not be published. Please try again." };
  }

  if (created?.moderation_status === "rejected") {
    return { error: "This post violates PeerGrid's community rules and cannot be published." };
  }
  if (created && media.length) {
    const { error: mediaError } = await supabase.from("post_media").insert(media.map((item, position) => ({
      post_id: created.id,
      position,
      path: item.path,
      kind: item.kind,
      name: item.name,
      mime: item.mime,
      size: item.size,
    })));
    const missingGalleryMigration = mediaError && ["42P01", "PGRST205"].includes(mediaError.code);
    if (missingGalleryMigration && media.length === 1) {
      // A single attachment remains fully represented by the legacy columns.
    } else if (mediaError) {
      await supabase.from("social_posts").delete().eq("id", created.id).eq("author_id", user.id);
      if (missingGalleryMigration) return { error: "Apply the latest post gallery migration before sharing multiple photos." };
      console.error("[PeerGrid] post gallery insert failed", { code: mediaError.code });
      return { error: "Your photos could not be attached to the post. Please try again." };
    }
  }
  if (created?.moderation_status === "published") revalidatePath("/feed");
  return { success: true, moderation: created?.moderation_status === "held" ? "held" : "published" };
}

export async function updateSocialPost(postId: string, rawBody: string): Promise<UpdatePostResult> {
  const { supabase, user } = await requireStudent();
  const body = rawBody.trim();
  if (!uuidPattern.test(postId)) return { error: "Invalid post." };
  if (body.length > 5000) return { error: "Posts can contain up to 5,000 characters." };
  const { data: existing, error: readError } = await supabase.from("social_posts").select("attachment_path").eq("id", postId).eq("author_id", user.id).maybeSingle();
  if (readError || !existing) return { error: "This post could not be edited." };
  if (!body && !existing.attachment_path) return { error: "Write something or keep an attachment." };
  const moderation = moderateContent(body);
  if (moderation.status === "rejected") return { error: "This post violates PeerGrid's community rules and cannot be published." };
  const { error } = await supabase.from("social_posts").update({
    body,
    moderation_status: moderation.status,
    moderation_reason: moderation.reason,
  }).eq("id", postId).eq("author_id", user.id);
  if (error) return { error: "Your changes could not be saved. Please try again." };
  revalidatePath("/feed");
  revalidatePath("/profile");
  return { success: true, moderation: moderation.status };
}

export async function deleteSocialPost(postId: string): Promise<DeletePostResult> {
  if (!uuidPattern.test(postId)) return { error: "Invalid post." };
  const { supabase, user } = await requireStudent();
  const { data: mediaRows } = await supabase.from("post_media")
    .select("path")
    .eq("post_id", postId);
  const { data: deleted, error } = await supabase.from("social_posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id)
    .select("attachment_path")
    .maybeSingle();
  if (error || !deleted) {
    if (error) console.error("[PeerGrid] social post delete failed", { code: error.code });
    return { error: "This post could not be deleted." };
  }
  const mediaPaths = [...new Set([
    ...(mediaRows ?? []).map((item) => String(item.path)),
    ...(deleted.attachment_path ? [deleted.attachment_path] : []),
  ])];
  if (mediaPaths.length) {
    const { error: cleanupError } = await supabase.storage.from("post-media").remove(mediaPaths);
    if (cleanupError) console.error("[PeerGrid] deleted post media cleanup pending", { code: cleanupError.message });
  }
  revalidatePath("/feed");
  revalidatePath("/profile");
  return { success: true };
}
