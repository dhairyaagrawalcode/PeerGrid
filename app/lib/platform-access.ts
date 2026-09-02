import type { PlatformAccess } from "../types/admin.ts";

// Shared by route protection, server authorization, and active-session checks.
export function accessDestination(access: PlatformAccess | null, authenticated: boolean): string | null {
  if (!access) return "/service-unavailable"; // Never fail open if policy lookup fails.
  if (access.is_admin) return null;
  if (authenticated && access.account_status !== "active") return "/account-restricted";
  if (access.maintenance_enabled) return "/maintenance";
  return null;
}
