"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/app/lib/auth";
import { moderateContent } from "@/app/lib/moderation";

export type CreatePostResult = { success?: boolean; error?: string; moderation?: "published" | "held" };
export type DeletePostResult = { success?: boolean; error?: string };
export type UpdatePostResult = { success?: boolean; error?: string; moderation?: "published" | "held" };

const allowedKinds = new Set(["image", "video", "document"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createSocialPost(formData: FormData): Promise<CreatePostResult> {
  const { supabase, user } = await requireStudent();
  const body = String(formData.get("body") ?? "").trim();
  const attachmentPath = String(formData.get("attachmentPath") ?? "").trim();
  const attachmentKind = String(formData.get("attachmentKind") ?? "").trim();
  const attachmentName = String(formData.get("attachmentName") ?? "").trim();
  const attachmentMime = String(formData.get("attachmentMime") ?? "").trim();
  const attachmentSize = Number(formData.get("attachmentSize") ?? 0);

  if (!body && !attachmentPath) return { error: "Write something or attach a file." };
  if (body.length > 5000) return { error: "Posts can contain up to 5,000 characters." };
  const moderation = moderateContent(body);
  if (moderation.status === "rejected") return { error: "This post violates PeerGrid's community rules and cannot be published." };

  const hasAttachment = Boolean(attachmentPath);
  if (hasAttachment) {
    if (!attachmentPath.startsWith(`${user.id}/`)) return { error: "Invalid attachment path." };
    if (!allowedKinds.has(attachmentKind) || !attachmentName || !attachmentMime || !Number.isSafeInteger(attachmentSize) || attachmentSize < 1 || attachmentSize > 25 * 1024 * 1024) {
      return { error: "The attachment details are incomplete." };
    }
  }

  const { data: created, error } = await supabase.from("social_posts").insert({
    author_id: user.id,
    body,
    attachment_path: hasAttachment ? attachmentPath : null,
    attachment_kind: hasAttachment ? attachmentKind : null,
    attachment_name: hasAttachment ? attachmentName.slice(0, 255) : null,
    attachment_mime: hasAttachment ? attachmentMime.slice(0, 120) : null,
    attachment_size: hasAttachment ? attachmentSize : null,
  }).select("moderation_status").single();

  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) {
      return { error: "The social posts migration has not been applied yet." };
    }
    if (error.message === "RATE_LIMIT_EXCEEDED") {
      return { error: "You are posting too quickly. Wait a few minutes and try again." };
    }
    console.error("[PeerGrid] social post insert failed", { code: error.code });
    return { error: "Your post could not be published. Please try again." };
  }

  if (created?.moderation_status === "rejected") {
    return { error: "This post violates PeerGrid's community rules and cannot be published." };
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
  if (deleted.attachment_path) {
    const { error: cleanupError } = await supabase.storage.from("post-media").remove([deleted.attachment_path]);
    if (cleanupError) console.error("[PeerGrid] deleted post media cleanup pending", { code: cleanupError.message });
  }
  revalidatePath("/feed");
  revalidatePath("/profile");
  return { success: true };
}
