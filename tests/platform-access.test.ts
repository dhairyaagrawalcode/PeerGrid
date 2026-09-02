import assert from "node:assert/strict";
import test from "node:test";
import { accessDestination } from "../app/lib/platform-access.ts";
import { isProtectedPath } from "../app/lib/routes.ts";
import type { PlatformAccess } from "../app/types/admin.ts";

const active: PlatformAccess = { is_admin: false, account_status: "active", maintenance_enabled: false, maintenance_message: "Maintenance" };
test("admin and problem-report routes require authentication", () => {
  for (const route of ["/admin", "/admin/users", "/admin/settings", "/report-problem", "/onboarding", "/pending-approval"]) assert.equal(isProtectedPath(route),true);
  assert.equal(isProtectedPath("/administrator"),false);
  assert.equal(isProtectedPath("/admin/login"),false);
});
test("ordinary valid sessions remain allowed", () => assert.equal(accessDestination(active,true),null));
test("policy lookup failure denies access", () => {
  assert.equal(accessDestination(null,true),"/service-unavailable");
  assert.equal(accessDestination(null,false),"/service-unavailable");
});
test("every non-active account status is blocked", () => {
  for (const account_status of ["suspended","disabled","removed"] as const) assert.equal(accessDestination({...active,account_status},true),"/account-restricted");
});
test("maintenance blocks logged-in and logged-out visitors", () => {
  assert.equal(accessDestination({...active,maintenance_enabled:true},true),"/maintenance");
  assert.equal(accessDestination({...active,maintenance_enabled:true},false),"/maintenance");
});
test("admin keeps access during maintenance", () => assert.equal(accessDestination({...active,is_admin:true,maintenance_enabled:true},true),null));
