"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/app/lib/auth";

export async function sendConnection(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const recipientId = String(formData.get("recipientId") ?? "");
  if (!recipientId || recipientId === user.id) return;

  const { data: existing } = await supabase
    .from("connection_requests")
    .select("id, status")
    .or(`and(requester_id.eq.${user.id},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${user.id})`)
    .maybeSingle();

  if (existing?.status === "rejected") {
    await supabase.from("connection_requests").delete().eq("id", existing.id);
  } else if (existing) {
    return;
  }

  await supabase.from("connection_requests").insert({ requester_id: user.id, recipient_id: recipientId });
  revalidatePath("/", "layout");
}

export async function respondConnection(formData: FormData) {
  const { supabase } = await requireStudent();
  const requestId = String(formData.get("requestId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!requestId || !["accepted", "rejected"].includes(status)) return;
  await supabase
    .from("connection_requests")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "pending");
  revalidatePath("/", "layout");
}

export async function removeConnection(formData: FormData) {
  const { supabase } = await requireStudent();
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return;
  await supabase.from("connection_requests").delete().eq("id", requestId);
  revalidatePath("/", "layout");
}

