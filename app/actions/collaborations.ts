"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStudent } from "@/app/lib/auth";
import { splitTags } from "@/app/lib/format";

export async function createCollaboration(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const campus = String(formData.get("campusId") ?? "");
  if (title.length < 5 || title.length > 100 || description.length < 10 || description.length > 1200) return;
  const { error } = await supabase.from("collaboration_posts").insert({
    author_id: user.id,
    campus_id: campus || null,
    title,
    description,
    tags: splitTags(String(formData.get("tags") ?? "")),
  });
  if (!error) {
    revalidatePath("/feed");
    revalidatePath("/collaborate");
    redirect("/collaborate");
  }
}

export async function setCollaborationStatus(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["open", "closed"].includes(status)) return;
  await supabase.from("collaboration_posts").update({ status }).eq("id", id).eq("author_id", user.id);
  revalidatePath("/feed");
  revalidatePath("/collaborate");
}

export async function deleteCollaboration(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("collaboration_posts").delete().eq("id", id).eq("author_id", user.id);
  revalidatePath("/feed");
  revalidatePath("/collaborate");
}

