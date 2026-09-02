"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminCookieName, adminCookieOptions, createAdminServerClient, passwordAdminConfigured } from "@/app/lib/admin-password";
import { ADMIN_SESSION_SECONDS, createAdminToken, hashAdminToken, validAdminToken, verifyAdminPassword } from "@/app/lib/admin-password-crypto";

export async function signInAdmin(_previous: { error: string }, formData: FormData): Promise<{ error: string }> {
  if (!passwordAdminConfigured()) return { error: "Admin login is not configured yet. Complete the server setup first." };
  const password = formData.get("password");
  if (typeof password !== "string" || password.length > 256) return { error: "Enter the admin password." };
  const supabase = createAdminServerClient();
  const { data: allowed, error: limitError } = await supabase.rpc("admin_password_login_attempt");
  if (limitError) return { error: "Admin login is unavailable. Check the admin migration and server configuration." };
  if (allowed !== true) return { error: "Too many login attempts. Please wait 15 minutes before trying again." };
  if (!await verifyAdminPassword(password, process.env.PEERGRID_ADMIN_PASSWORD_HASH!)) return { error: "Incorrect admin password." };

  const token = createAdminToken();
  const { data, error } = await supabase.rpc("admin_password_create_session", {
    session_hash: hashAdminToken(token),
    key_fingerprint: hashAdminToken(process.env.PEERGRID_ADMIN_PASSWORD_HASH!),
  });
  if (error || !data) return { error: "Could not start the admin session. Please try again." };
  const jar = await cookies();
  const previous = jar.get(adminCookieName)?.value;
  if (validAdminToken(previous)) await supabase.rpc("admin_password_end_session", { session_hash: hashAdminToken(previous) });
  jar.set(adminCookieName, token, { ...adminCookieOptions, maxAge: ADMIN_SESSION_SECONDS });
  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function signOutAdmin() {
  const jar = await cookies();
  const token = jar.get(adminCookieName)?.value;
  if (validAdminToken(token) && passwordAdminConfigured()) {
    const { error } = await createAdminServerClient().rpc("admin_password_end_session", { session_hash: hashAdminToken(token) });
    if (error) throw new Error("Admin sign-out could not be completed. Please retry.");
  }
  jar.set(adminCookieName, "", { ...adminCookieOptions, maxAge: 0 });
  revalidatePath("/admin", "layout");
  redirect("/admin/login");
}
