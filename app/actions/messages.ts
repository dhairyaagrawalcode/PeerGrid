"use server";

import { redirect } from "next/navigation";
import { requireStudent } from "@/app/lib/auth";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function startConversation(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const otherUserId = String(formData.get("otherUserId") ?? "");
  if (!uuidPattern.test(otherUserId) || otherUserId === user.id) return;

  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    other_user_id: otherUserId,
  });
  if (error || !data) {
    throw new Error(error?.message || "Could not open this conversation.");
  }

  redirect(`/messages/${data}`);
}
