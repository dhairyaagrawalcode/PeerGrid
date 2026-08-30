"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/app/lib/auth";

export type CreatePostResult = { success?: boolean; error?: string };

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

  const hasAttachment = Boolean(attachmentPath);
  if (hasAttachment) {
    if (!attachmentPath.startsWith(`${user.id}/`)) return { error: "Invalid attachment path." };
    if (!allowedKinds.has(attachmentKind) || !attachmentName || !attachmentMime) {
      return { error: "The attachment details are incomplete." };
    }
  }

  const { error } = await supabase.from("social_posts").insert({
    author_id: user.id,
    body,
    attachment_path: hasAttachment ? attachmentPath : null,
    attachment_kind: hasAttachment ? attachmentKind : null,
    attachment_name: hasAttachment ? attachmentName.slice(0, 255) : null,
    attachment_mime: hasAttachment ? attachmentMime.slice(0, 120) : null,
  });

  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) {
      return { error: "The social posts migration has not been applied yet." };
    }
    return { error: error.message };
  }

  revalidatePath("/feed");
  return { success: true };
}
