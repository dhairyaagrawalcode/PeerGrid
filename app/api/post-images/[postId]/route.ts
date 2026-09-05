import { createClient } from "@/app/lib/supabase/server";
import { makePostThumbnail, thumbnailWidths } from "@/app/lib/post-thumbnail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Private media must not go through Next Image's public, shared optimizer cache.
// No arbitrary URLs/paths, service-role key, or process-wide private-data cache.
export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const width = Number(new URL(request.url).searchParams.get("w") ?? 800);
  const failure = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId)
    || !(thumbnailWidths as readonly number[]).includes(width)) return failure(400);

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return failure(401);
  // Post RLS plus the API access hook enforce verified/active account access,
  // maintenance mode, and visibility. The path comes only from an authorized row.
  const { data: post, error } = await supabase.from("social_posts")
    .select("attachment_path, attachment_kind")
    .eq("id", postId).eq("moderation_status", "published").maybeSingle();
  if (error || !post?.attachment_path || post.attachment_kind !== "image") return failure(404);
  const { data: original, error: storageError } = await supabase.storage.from("post-media").download(post.attachment_path);
  if (storageError || !original) return failure(404);
  if (original.size > 25 * 1024 * 1024) return failure(422);
  try {
    const image = await makePostThumbnail(Buffer.from(await original.arrayBuffer()), width);
    return new Response(new Uint8Array(image), { headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(image.byteLength),
      "Server-Timing": `original;desc="${original.size}"`,
      "Cache-Control": "private, max-age=300",
      "Vary": "Cookie",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    } });
  } catch {
    // The client keeps the original signed-image fallback for animation/unsupported
    // formats. Do not log storage paths, signed URLs or image content.
    return failure(422);
  }
}
