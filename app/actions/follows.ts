"use server";

import { requireStudent } from "@/app/lib/auth";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function followUser(targetId: string) {
  const { supabase, user } = await requireStudent();
  if (!uuidPattern.test(targetId) || targetId === user.id) return { error: "Invalid student." };

  const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
  if (error && error.code !== "23505") return { error: "Could not follow this student. Please try again." };
  return { success: true };
}

export async function unfollowUser(targetId: string) {
  const { supabase, user } = await requireStudent();
  if (!uuidPattern.test(targetId) || targetId === user.id) return { error: "Invalid student." };

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);
  if (error) return { error: "Could not unfollow this student. Please try again." };
  return { success: true };
}
