import type { SupabaseClient } from "@supabase/supabase-js";

export const GROUP_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const GROUP_AVATAR_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function validateGroupAvatar(file: File) {
  if (!GROUP_AVATAR_TYPES.has(file.type)) return "Choose a JPG, PNG, or WebP image.";
  if (file.size > GROUP_AVATAR_MAX_BYTES) return "Group pictures must be 5 MB or smaller.";
  return null;
}

export async function uploadGroupAvatar(supabase: SupabaseClient, ownerId: string, file: File) {
  const validationError = validateGroupAvatar(file);
  if (validationError) throw new Error(validationError);
  const extension = GROUP_AVATAR_TYPES.get(file.type)!;
  const path = `${ownerId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("group-avatars").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export function groupAvatarUrl(path: string | null | undefined) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base || !path) return null;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/group-avatars/${encodedPath}`;
}
