"use server";

import { requireStudent } from "@/app/lib/auth";
import type { PostComment } from "@/app/types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function togglePostLike(postId: string) {
  const { supabase, user } = await requireStudent();
  if (!uuidPattern.test(postId)) return { error: "Invalid post.", liked: false, count: 0 };

  const { data: existing, error: readError } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) return { error: readError.message, liked: false, count: 0 };

  let liked = !existing;
  if (existing) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) return { error: error.message, liked: true, count: 0 };
  } else {
    const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    if (error && error.code !== "23505") return { error: error.message, liked: false, count: 0 };
    liked = true;
  }

  const { count, error: countError } = await supabase
    .from("post_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);
  return { error: countError?.message, liked, count: count ?? 0 };
}

export async function getPostComments(postId: string) {
  const { supabase } = await requireStudent();
  if (!uuidPattern.test(postId)) return { comments: [] as PostComment[], error: "Invalid post." };

  const { data, error } = await supabase
    .from("post_comments")
    .select("id, post_id, author_id, body, created_at, author:profiles!post_comments_author_id_fkey(id, username, full_name, avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(100);
  return {
    comments: (data ?? []) as unknown as PostComment[],
    error: error?.message,
  };
}

export async function addPostComment(postId: string, rawBody: string) {
  const { supabase, user } = await requireStudent();
  const body = rawBody.trim();
  if (!uuidPattern.test(postId)) return { error: "Invalid post.", count: 0 };
  if (!body || body.length > 1000) return { error: "Comments must contain 1–1,000 characters.", count: 0 };

  const { error } = await supabase.from("post_comments").insert({
    post_id: postId,
    author_id: user.id,
    body,
  });
  if (error) return { error: error.message, count: 0 };

  const { count, error: countError } = await supabase
    .from("post_comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);
  return { error: countError?.message, count: count ?? 0 };
}
