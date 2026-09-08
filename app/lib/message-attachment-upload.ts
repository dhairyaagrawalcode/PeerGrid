"use client";

import "client-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./supabase/config";

export async function uploadEncryptedMessageAttachment(
  supabase: SupabaseClient,
  path: string,
  encrypted: Uint8Array,
  onProgress: (progress: number) => void,
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Your session expired. Sign in and try again.");
  const { url, key } = getSupabaseConfig();
  const objectPath = path.split("/").map(encodeURIComponent).join("/");
  const blob = new Blob([encrypted as BlobPart], { type: "application/octet-stream" });

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${url.replace(/\/$/, "")}/storage/v1/object/message-media/${objectPath}`);
    request.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    request.setRequestHeader("apikey", key);
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    request.onerror = () => reject(new Error("The encrypted attachment upload failed."));
    request.onabort = () => reject(new Error("The encrypted attachment upload was cancelled."));
    request.onload = () => request.status >= 200 && request.status < 300
      ? resolve()
      : reject(new Error("The encrypted attachment could not be stored."));
    request.send(blob);
  });
}
