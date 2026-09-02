import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { hashAdminToken, isPasswordHash, validAdminToken } from "./admin-password-crypto";

export const adminCookieName = process.env.NODE_ENV === "production" ? "__Secure-peergrid_admin" : "peergrid_admin";
export const adminCookieOptions = { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/admin" };

export function passwordAdminConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) && isPasswordHash(process.env.PEERGRID_ADMIN_PASSWORD_HASH));
}

export function createAdminServerClient(token?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Admin server credentials are not configured.");
  return createClient(url, key, {
    // Admin reads must never reuse a Next.js fetch-cache entry, including on refresh.
    global: { headers: token && validAdminToken(token) ? { "x-peergrid-admin-session": token } : {}, fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// No trust is placed in cookie presence alone; validate against the database on every request.
export async function getPasswordAdminSession() {
  if (!passwordAdminConfigured()) return null;
  const token = (await cookies()).get(adminCookieName)?.value;
  if (!validAdminToken(token)) return null;
  const supabase = createAdminServerClient(token);
  const { data, error } = await supabase.rpc("admin_password_validate_session", {
    session_hash: hashAdminToken(token),
    key_fingerprint: hashAdminToken(process.env.PEERGRID_ADMIN_PASSWORD_HASH!),
  });
  if (error || typeof data !== "string") return null;
  return { supabase, sessionId: data };
}
