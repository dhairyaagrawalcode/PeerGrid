// Small, credential-free contract shared by the server stream, UI, and tests.
export type AdminDataVersion = { revision: string; time_bucket: string; checked_at: string };
export type AdminLiveUpdate = AdminDataVersion & { realtime: boolean };
export function isAdminLiveUpdate(value: unknown): value is AdminLiveUpdate {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<AdminLiveUpdate>;
  return typeof v.revision === "string" && /^\d+$/.test(v.revision) &&
    typeof v.time_bucket === "string" && /^\d+$/.test(v.time_bucket) &&
    typeof v.checked_at === "string" && Number.isFinite(Date.parse(v.checked_at)) && typeof v.realtime === "boolean";
}
export function needsAdminRefresh(previous: AdminDataVersion | null, next: AdminDataVersion) {
  // Minute changes also expire rolling activity counts without a database write.
  return !previous || previous.revision !== next.revision || previous.time_bucket !== next.time_bucket;
}
