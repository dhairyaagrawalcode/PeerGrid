"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/app/lib/auth";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function followUser(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const targetId = String(formData.get("targetId") ?? "");
  if (!uuidPattern.test(targetId) || targetId === user.id) return;

  await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
  revalidatePath("/", "layout");
}

export async function unfollowUser(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const targetId = String(formData.get("targetId") ?? "");
  if (!uuidPattern.test(targetId) || targetId === user.id) return;

  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);
  revalidatePath("/", "layout");
}
