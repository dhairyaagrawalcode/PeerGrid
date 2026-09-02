"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/lib/admin";

type Result = { error?: string; success?: boolean };
function validUuid(value: unknown) { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }

export async function setAdminAccountStatus(userId: string, status: string, reason: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!validUuid(userId) || !["active","suspended","disabled","removed"].includes(status) || typeof reason !== "string" || reason.length > 500) return { error: "Invalid account action." };
  const { error } = await supabase.rpc("admin_set_account_status", { target_user_id: userId, new_status: status, admin_reason: reason.trim() });
  if (error) return { error: error.message.includes("CANNOT_CHANGE_ADMIN") ? "Admin accounts cannot be changed here." : "The account could not be updated." };
  revalidatePath("/admin");
  return { success: true };
}
export async function setAdminMaintenance(enabled: boolean, message: string, reason: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (typeof enabled !== "boolean" || typeof message !== "string" || typeof reason !== "string" || message.trim().length < 1 || message.length > 300 || reason.length > 500) return { error: "Enter a maintenance message (up to 300 characters)." };
  const { error } = await supabase.rpc("admin_set_maintenance", { enabled, message: message.trim(), admin_reason: reason.trim() });
  if (error) return { error: "Maintenance settings could not be saved." };
  revalidatePath("/admin/settings");
  return { success: true };
}
export async function setAdminIssueStatus(issueId: string, status: string, reason: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!validUuid(issueId) || !["new","investigating","resolved","closed"].includes(status) || typeof reason !== "string" || reason.length > 500) return { error: "Invalid issue update." };
  const { error } = await supabase.rpc("admin_update_issue", { issue_id: issueId, new_status: status, admin_reason: reason.trim() });
  if (error) return { error: "The issue could not be updated." };
  revalidatePath("/admin/issues");
  return { success: true };
}
