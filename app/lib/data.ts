import type {
  Campus,
  CollaborationPost,
  CollaborationProof,
  ConversationMember,
  ConversationSummary,
  DirectMessage,
  FollowRecord,
  FollowSummary,
  MutualFollowContext,
  ProfileMatch,
  PendingCollaborationConfirmation,
  PeerGridNotification,
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
  "id, username, full_name, avatar_url, campus_id, graduation_year, program, current_status, bio, goals, github_url, linkedin_url, portfolio_url, is_verified, campus:campuses(id, slug, name, city), profile_skills(skill:skills(id, name)), profile_interests(interest:interests(id, name)), profile_can_help(skill:skills(id, name)), profile_needs_help(skill:skills(id, name))";
const studentDiscoverySelect =
  "id, username, full_name, avatar_url, campus_id, graduation_year, program, current_status, is_verified, campus:campuses(id, slug, name, city), profile_skills(skill:skills(id, name)), profile_interests(interest:interests(id, name)), profile_can_help(skill:skills(id, name)), profile_needs_help(skill:skills(id, name))";

function normalizeStudent(row: unknown) {
  const raw = row as StudentProfile & {
    profile_skills?: { skill: { id: number; name: string } | null }[];
    profile_interests?: { interest: { id: number; name: string } | null }[];
    profile_can_help?: { skill: { id: number; name: string } | null }[];
    profile_needs_help?: { skill: { id: number; name: string } | null }[];
  };
  return {
    ...raw,
    skills: raw.skills ?? raw.profile_skills?.map((item) => item.skill).filter(Boolean) ?? [],
    interests:
      raw.interests ?? raw.profile_interests?.map((item) => item.interest).filter(Boolean) ?? [],
    can_help_with:
      raw.can_help_with ?? raw.profile_can_help?.map((item) => item.skill).filter(Boolean) ?? [],
    needs_help_with:
      raw.needs_help_with ?? raw.profile_needs_help?.map((item) => item.skill).filter(Boolean) ?? [],
  } as StudentProfile;
}

export async function getProfileMatches(
  supabase: SupabaseClient,
  limit = 6,
): Promise<ProfileMatch[]> {
  const { data, error } = await supabase.rpc("get_profile_matches", {
    result_limit: Math.min(Math.max(limit, 1), 12),
  });
  if (error) {
    console.error("[PeerGrid] profile suggestions unavailable", { code: error.code });
    return [];
  }
  return (data ?? []).map((row: unknown) => {
    const raw = row as StudentProfile & { match_reason: string };
    return {
      student: normalizeStudent(raw),
      reason: raw.match_reason,
    } satisfies ProfileMatch;
  });
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
  options: { status?: "open" | "full" | "closed" | "completed"; limit?: number; offset?: number; ranked?: boolean } = {},
) {
  const limit = Math.min(Math.max(options.limit ?? COLLABORATION_PAGE_SIZE, 1), 50);
  const offset = Math.max(options.offset ?? 0, 0);
  let rankedRows: Array<{ collaboration_id: string; recommendation_reason: string }> = [];
  if (options.ranked) {
    const { data: ranking, error: rankingError } = await supabase.rpc("get_ranked_collaborations", {
      result_limit: limit,
      result_offset: offset,
    });
    if (rankingError && !["42883", "PGRST202"].includes(rankingError.code)) throw rankingError;
    rankedRows = (ranking ?? []) as typeof rankedRows;
  }
  let query = supabase
    .from("collaboration_posts")
    .select(
      "id, author_id, campus_id, title, description, tags, collaboration_type, required_skills, team_current, team_capacity, commitment, status, moderation_status, moderation_reason, created_at, author:profiles!collaboration_posts_author_id_fkey(id, username, full_name, avatar_url, program), campus:campuses(id, slug, name, city)",
    )
    .order("created_at", { ascending: false });

  if (options.status) query = query.eq("status", options.status);
  if (options.ranked && rankedRows.length) query = query.in("id", rankedRows.map((row) => row.collaboration_id));
  else query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  const posts = (data ?? []) as unknown as CollaborationPost[];
  if (!rankedRows.length) return posts;
  const byId = new Map(posts.map((post) => [post.id, post]));
  return rankedRows.flatMap((ranking) => {
    const post = byId.get(ranking.collaboration_id);
    return post ? [{ ...post, recommendation_reason: ranking.recommendation_reason }] : [];
  });
}

export async function getSocialPosts(
  supabase: SupabaseClient,
  options: { limit?: number; offset?: number; authorId?: string; ranked?: boolean } = {},
) {
  const limit = Math.min(Math.max(options.limit ?? POST_PAGE_SIZE, 1), 50);
  const offset = Math.max(options.offset ?? 0, 0);
  let rankedRows: Array<{ post_id: string; recommendation_reason: string }> = [];
  if (options.ranked && !options.authorId) {
    const { data: ranking, error: rankingError } = await supabase.rpc("get_ranked_feed", {
      result_limit: limit,
      result_offset: offset,
    });
    if (rankingError) {
      console.error("[PeerGrid] ranked feed unavailable; using recent posts", { code: rankingError.code });
    } else {
      rankedRows = (ranking ?? []) as typeof rankedRows;
    }
  }
  let query = supabase
    .from("social_posts")
    .select(
      "id, author_id, body, attachment_path, attachment_kind, attachment_name, attachment_mime, moderation_status, moderation_reason, created_at, author:profiles!social_posts_author_id_fkey(id, username, full_name, avatar_url, program, campus:campuses(id, slug, name, city))",
    )
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false });

  if (options.authorId) query = query.eq("author_id", options.authorId);
  if (rankedRows.length) query = query.in("id", rankedRows.map((row) => row.post_id));
  else query = query.range(offset, offset + limit - 1);
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
    if (engagementError) {
      console.error("[PeerGrid] post engagement unavailable", { code: engagementError.code });
    }
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
    if (signedError) {
      console.error("[PeerGrid] post media URLs unavailable", { message: signedError.message });
    } else {
      for (const item of signed ?? []) {
        if (item.path && item.signedUrl) signedUrls.set(item.path, item.signedUrl);
      }
    }
  }

  const hydrated = posts.map((post) => ({
    ...post,
    attachment_url: post.attachment_path ? signedUrls.get(post.attachment_path) ?? null : null,
    ...(engagement.get(post.id) ?? { like_count: 0, comment_count: 0, viewer_liked: false }),
  })) as SocialPost[];
  if (!rankedRows.length) return hydrated;
  const byId = new Map(hydrated.map((post) => [post.id, post]));
  return rankedRows.flatMap((ranking) => {
    const post = byId.get(ranking.post_id);
    return post ? [{ ...post, recommendation_reason: ranking.recommendation_reason }] : [];
  });
}

export async function getCollaborationProofs(supabase: SupabaseClient, profileId: string) {
  const { data, error } = await supabase.rpc("get_profile_collaboration_proofs", {
    candidate_profile_id: profileId,
  });
  if (error) {
    if (["42883", "PGRST202"].includes(error.code)) return [];
    throw error;
  }
  return (data ?? []) as CollaborationProof[];
}

export async function getPendingCollaborationConfirmations(supabase: SupabaseClient, profileId: string) {
  const { data, error } = await supabase
    .from("collaboration_participants")
    .select("passport_id, role, created_at, passport:collaboration_passports!collaboration_participants_passport_id_fkey(id, project_name, duration, creator:profiles!collaboration_passports_creator_id_fkey(id, username, full_name, avatar_url))")
    .eq("profile_id", profileId)
    .eq("confirmation_status", "pending")
    .order("created_at", { ascending: false });
  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) return [];
    throw error;
  }
  return (data ?? []) as unknown as PendingCollaborationConfirmation[];
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
    console.error("[PeerGrid] follow summary unavailable", { code: error.code });
    return { follower_count: 0, following_count: 0, viewer_follows: false } as FollowSummary;
  }
  const summary = data as unknown as { follower_count?: number; following_count?: number; viewer_follows?: boolean } | null;
  return {
    follower_count: Number(summary?.follower_count ?? 0),
    following_count: Number(summary?.following_count ?? 0),
    viewer_follows: Boolean(summary?.viewer_follows),
  } as FollowSummary;
}

export async function getMutualFollowContexts(supabase: SupabaseClient, profileIds: string[]): Promise<Map<string, MutualFollowContext>> {
  const boundedIds = [...new Set(profileIds)].slice(0, 100);
  if (!boundedIds.length) return new Map<string, MutualFollowContext>();
  const { data, error } = await supabase.rpc("get_mutual_follow_contexts", { candidate_profile_ids: boundedIds });
  if (error) {
    if (!["42883", "PGRST202"].includes(error.code)) console.error("[PeerGrid] mutual follows unavailable", { code: error.code });
    return new Map<string, MutualFollowContext>();
  }
  return new Map<string, MutualFollowContext>((data ?? []).map((row: { profile_id: string; mutual_count: number | string; mutual_names: string[] | null }) => [row.profile_id, {
    profile_id: row.profile_id,
    mutual_count: Number(row.mutual_count ?? 0),
    mutual_names: row.mutual_names ?? [],
  } satisfies MutualFollowContext] as const));
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
    .select("id, participant_low, participant_high, kind, title, avatar_path, created_at, last_message_at")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw error;
  if (!conversation) return null;
  if (conversation.kind === "group") {
    const { count, error: countError } = await supabase
      .from("conversation_members")
      .select("profile_id", { count: "exact", head: true })
      .eq("conversation_id", conversationId);
    if (countError) throw countError;
    return {
      conversation_id: conversation.id,
      other_user_id: null,
      other_username: null,
      other_full_name: conversation.title ?? "Group conversation",
      other_avatar_url: null,
      other_program: null,
      created_at: conversation.created_at,
      last_activity_at: conversation.last_message_at ?? conversation.created_at,
      last_message_body: null,
      last_message_sender_id: null,
      last_message_created_at: null,
      unread_count: 0,
      is_group: true,
      group_title: conversation.title,
      group_avatar_path: conversation.avatar_path,
      member_count: Number(count ?? 0),
    } as ConversationSummary;
  }
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
    is_group: false,
    group_title: null,
    group_avatar_path: null,
    member_count: 2,
  } as ConversationSummary;
}

export async function getConversationMembers(supabase: SupabaseClient, conversationId: string) {
  const { data, error } = await supabase
    .from("conversation_members")
    .select("conversation_id, profile_id, role, joined_at, profile:profiles!conversation_members_profile_id_fkey(id, username, full_name, avatar_url)")
    .eq("conversation_id", conversationId)
    .order("joined_at");
  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) return [];
    throw error;
  }
  return (data ?? []) as unknown as ConversationMember[];
}

export async function getDirectMessages(
  supabase: SupabaseClient,
  conversationId: string,
) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, ciphertext, nonce, key_envelopes, encryption_version, sender_device_id, signature, created_at, read_at")
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

export async function getUnreadCollaborationCount(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("get_unread_collaboration_count");
  if (error) {
    if (["42883", "PGRST202"].includes(error.code)) return 0;
    console.error("[PeerGrid] collaboration unread count unavailable", { code: error.code });
    return 0;
  }
  return Number(data ?? 0);
}

export async function getUnreadNotificationCount(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("get_unread_notification_count");
  if (error) {
    if (["42883", "PGRST202"].includes(error.code)) return 0;
    console.error("[PeerGrid] notification unread count unavailable", { code: error.code });
    return 0;
  }
  return Number(data ?? 0);
}

export async function getNotifications(supabase: SupabaseClient, limit = 50) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, collaboration_id, passport_id, post_id, conversation_id, created_at, read_at, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url), collaboration:collaboration_posts!notifications_collaboration_id_fkey(id, title), passport:collaboration_passports!notifications_passport_id_fkey(id, project_name), post:social_posts!notifications_post_id_fkey(id, body), conversation:conversations!notifications_conversation_id_fkey(id, title)")
    .is("cleared_at", null)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) return [];
    throw error;
  }
  return (data ?? []) as unknown as PeerGridNotification[];
}
