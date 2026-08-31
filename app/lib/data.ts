import type {
  Campus,
  CollaborationPost,
  ConversationSummary,
  DirectMessage,
  FollowRecord,
  FollowSummary,
  SocialPost,
  StudentProfile,
} from "@/app/types";

type SupabaseClient = Awaited<ReturnType<typeof import("./supabase/server").createClient>>;

export const POST_PAGE_SIZE = 20;
export const COLLABORATION_PAGE_SIZE = 20;
export const SEARCH_PAGE_SIZE = 30;
export const MESSAGE_PAGE_SIZE = 50;
export const CONVERSATION_PAGE_SIZE = 50;
export const NETWORK_PAGE_SIZE = 30;

const studentSelect =
  "id, username, full_name, avatar_url, campus_id, graduation_year, program, bio, goals, github_url, linkedin_url, portfolio_url, is_verified, campus:campuses(id, slug, name, city), profile_skills(skill:skills(id, name)), profile_interests(interest:interests(id, name))";
const studentDiscoverySelect =
  "id, username, full_name, avatar_url, campus_id, graduation_year, program, is_verified, campus:campuses(id, slug, name, city), profile_skills(skill:skills(id, name)), profile_interests(interest:interests(id, name))";

function normalizeStudent(row: unknown) {
  const raw = row as StudentProfile & {
    profile_skills?: { skill: { id: number; name: string } | null }[];
    profile_interests?: { interest: { id: number; name: string } | null }[];
  };
  return {
    ...raw,
    skills: raw.skills ?? raw.profile_skills?.map((item) => item.skill).filter(Boolean) ?? [],
    interests:
      raw.interests ?? raw.profile_interests?.map((item) => item.interest).filter(Boolean) ?? [],
  } as StudentProfile;
}

export async function getCampuses(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("campuses")
    .select("id, slug, name, city")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Campus[];
}

export async function getStudents(
  supabase: SupabaseClient,
  currentId: string,
  options: { limit?: number; offset?: number } = {},
) {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const { data, error } = await supabase
    .from("profiles")
    .select(studentDiscoverySelect)
    .eq("is_verified", true)
    .neq("id", currentId)
    .order("full_name")
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []).map(normalizeStudent);
}

export async function getStudentsByIds(supabase: SupabaseClient, ids: string[]) {
  const boundedIds = [...new Set(ids)].slice(0, 50);
  if (!boundedIds.length) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select(studentDiscoverySelect)
    .in("id", boundedIds)
    .eq("is_verified", true);
  if (error) throw error;
  return (data ?? []).map(normalizeStudent);
}

export async function searchStudents(
  supabase: SupabaseClient,
  query: string,
  offset = 0,
) {
  const { data, error } = await supabase.rpc("search_student_profiles", {
    search_text: query.trim().slice(0, 120),
    result_limit: SEARCH_PAGE_SIZE + 1,
    result_offset: Math.max(offset, 0),
  });
  if (error) throw error;
  const rows = (data ?? []) as Array<StudentProfile & { viewer_follows: boolean }>;
  return {
    students: rows.slice(0, SEARCH_PAGE_SIZE).map(normalizeStudent),
    followingIds: rows
      .slice(0, SEARCH_PAGE_SIZE)
      .filter((row) => row.viewer_follows)
      .map((row) => row.id),
    hasMore: rows.length > SEARCH_PAGE_SIZE,
  };
}

export async function getStudent(
  supabase: SupabaseClient,
  match: { id?: string; username?: string },
) {
  let query = supabase
    .from("profiles")
    .select(studentSelect);
  query = match.id ? query.eq("id", match.id) : query.eq("username", match.username ?? "");
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return normalizeStudent(data);
}

export async function getCollaborations(
  supabase: SupabaseClient,
  options: { status?: "open" | "closed"; limit?: number; offset?: number } = {},
) {
  const limit = Math.min(Math.max(options.limit ?? COLLABORATION_PAGE_SIZE, 1), 50);
  const offset = Math.max(options.offset ?? 0, 0);
  let query = supabase
    .from("collaboration_posts")
    .select(
      "id, author_id, campus_id, title, description, tags, status, created_at, author:profiles!collaboration_posts_author_id_fkey(id, username, full_name, avatar_url, program), campus:campuses(id, slug, name, city)",
    )
    .order("created_at", { ascending: false });

  if (options.status) query = query.eq("status", options.status);
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CollaborationPost[];
}

export async function getSocialPosts(
  supabase: SupabaseClient,
  options: { limit?: number; offset?: number; authorId?: string } = {},
) {
  const limit = Math.min(Math.max(options.limit ?? POST_PAGE_SIZE, 1), 50);
  const offset = Math.max(options.offset ?? 0, 0);
  let query = supabase
    .from("social_posts")
    .select(
      "id, author_id, body, attachment_path, attachment_kind, attachment_name, attachment_mime, created_at, author:profiles!social_posts_author_id_fkey(id, username, full_name, avatar_url, program, campus:campuses(id, slug, name, city))",
    )
    .order("created_at", { ascending: false });

  if (options.authorId) query = query.eq("author_id", options.authorId);
  query = query.range(offset, offset + limit - 1);
  const { data, error } = await query;
  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) return [];
    throw error;
  }

  const postIds = (data ?? []).map((row) => String(row.id));
  const engagement = new Map<string, { like_count: number; comment_count: number; viewer_liked: boolean }>();
  if (postIds.length) {
    const { data: rows, error: engagementError } = await supabase.rpc(
      "get_post_engagement",
      { candidate_post_ids: postIds },
    );
    if (engagementError && !["42883", "PGRST202"].includes(engagementError.code)) throw engagementError;
    for (const row of rows ?? []) {
      engagement.set(String(row.post_id), {
        like_count: Number(row.like_count ?? 0),
        comment_count: Number(row.comment_count ?? 0),
        viewer_liked: Boolean(row.viewer_liked),
      });
    }
  }

  const posts = (data ?? []) as unknown as Array<
    Omit<SocialPost, "attachment_url" | "like_count" | "comment_count" | "viewer_liked">
  >;
  const mediaPaths = posts.flatMap((post) => (post.attachment_path ? [post.attachment_path] : []));
  const signedUrls = new Map<string, string>();
  if (mediaPaths.length) {
    const { data: signed, error: signedError } = await supabase.storage
      .from("post-media")
      .createSignedUrls(mediaPaths, 60 * 60);
    if (signedError) throw signedError;
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) signedUrls.set(item.path, item.signedUrl);
    }
  }

  return posts.map((post) => ({
    ...post,
    attachment_url: post.attachment_path ? signedUrls.get(post.attachment_path) ?? null : null,
    ...(engagement.get(post.id) ?? { like_count: 0, comment_count: 0, viewer_liked: false }),
  })) as SocialPost[];
}

export async function getFollows(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id, following_id, created_at")
    .or(`follower_id.eq.${userId},following_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) return [];
    throw error;
  }
  return (data ?? []) as FollowRecord[];
}

export async function getFollowSummary(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .rpc("get_follow_summary", { candidate_user_id: userId })
    .maybeSingle();
  if (error) {
    if (["42883", "PGRST202"].includes(error.code)) {
      return { follower_count: 0, following_count: 0, viewer_follows: false } as FollowSummary;
    }
    throw error;
  }
  const summary = data as unknown as { follower_count?: number; following_count?: number; viewer_follows?: boolean } | null;
  return {
    follower_count: Number(summary?.follower_count ?? 0),
    following_count: Number(summary?.following_count ?? 0),
    viewer_follows: Boolean(summary?.viewer_follows),
  } as FollowSummary;
}

export async function getConversationSummaries(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("get_conversation_summaries", {
    result_limit: CONVERSATION_PAGE_SIZE + 1,
    result_offset: 0,
  });
  if (error) {
    if (["42883", "PGRST202"].includes(error.code)) return { conversations: [], hasMore: false };
    throw error;
  }
  const rows = (data ?? []) as Array<
    Omit<ConversationSummary, "unread_count"> & {
      unread_count: number | string | null;
    }
  >;
  const conversations = rows.slice(0, CONVERSATION_PAGE_SIZE).map((row) => ({
    ...row,
    unread_count: Number(row.unread_count ?? 0),
  })) as ConversationSummary[];
  return { conversations, hasMore: rows.length > CONVERSATION_PAGE_SIZE };
}

export async function getConversationSummary(
  supabase: SupabaseClient,
  conversationId: string,
  currentId: string,
) {
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id, participant_low, participant_high, created_at, last_message_at")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw error;
  if (!conversation) return null;
  const otherId = conversation.participant_low === currentId
    ? conversation.participant_high
    : conversation.participant_low;
  const { data: other, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, program")
    .eq("id", otherId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!other) return null;
  return {
    conversation_id: conversation.id,
    other_user_id: other.id,
    other_username: other.username,
    other_full_name: other.full_name,
    other_avatar_url: other.avatar_url,
    other_program: other.program,
    created_at: conversation.created_at,
    last_activity_at: conversation.last_message_at ?? conversation.created_at,
    last_message_body: null,
    last_message_sender_id: null,
    last_message_created_at: null,
    unread_count: 0,
  } as ConversationSummary;
}

export async function getDirectMessages(
  supabase: SupabaseClient,
  conversationId: string,
) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at, read_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE + 1);
  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) return { messages: [], hasMore: false };
    throw error;
  }
  const rows = (data ?? []) as DirectMessage[];
  return {
    messages: rows.slice(0, MESSAGE_PAGE_SIZE).reverse(),
    hasMore: rows.length > MESSAGE_PAGE_SIZE,
  };
}

export async function getUnreadMessageCount(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("get_unread_message_count");
  if (error) {
    if (["42883", "PGRST202"].includes(error.code)) return 0;
    throw error;
  }
  return Number(data ?? 0);
}
