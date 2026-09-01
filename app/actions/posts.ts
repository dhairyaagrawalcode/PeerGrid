"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/app/lib/auth";
import { moderateContent } from "@/app/lib/moderation";

export type CreatePostResult = { success?: boolean; error?: string; moderation?: "published" | "held" };

const allowedKinds = new Set(["image", "video", "document"]);

export async function createSocialPost(formData: FormData): Promise<CreatePostResult> {
  const { supabase, user } = await requireStudent();
  const body = String(formData.get("body") ?? "").trim();
  const attachmentPath = String(formData.get("attachmentPath") ?? "").trim();
  const attachmentKind = String(formData.get("attachmentKind") ?? "").trim();
  const attachmentName = String(formData.get("attachmentName") ?? "").trim();
  const attachmentMime = String(formData.get("attachmentMime") ?? "").trim();

  if (!body && !attachmentPath) return { error: "Write something or attach a file." };
  if (body.length > 5000) return { error: "Posts can contain up to 5,000 characters." };
  const moderation = moderateContent(body);
  if (moderation.status === "rejected") return { error: "This post violates PeerGrid's community rules and cannot be published." };

  const hasAttachment = Boolean(attachmentPath);
  if (hasAttachment) {
    if (!attachmentPath.startsWith(`${user.id}/`)) return { error: "Invalid attachment path." };
    if (!allowedKinds.has(attachmentKind) || !attachmentName || !attachmentMime) {
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
