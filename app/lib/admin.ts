import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getPasswordAdminSession } from "./admin-password";

export const requireAdmin = cache(async () => {
  const session = await getPasswordAdminSession();
  if (!session) redirect("/admin/login");
  return session;
});

export async function adminQuery<T>(name: string, params: Record<string, unknown> = {}): Promise<T> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error("Admin data could not be loaded. Check that the admin migration is applied.");
  return data as T;
}

export function pageOffset(value?: string, size = 30) {
  const page = Number(value);
  return (Number.isSafeInteger(page) && page > 0 ? Math.min(page, 1000) : 0) * size;
}
export function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value)) : "Not recorded";
}
