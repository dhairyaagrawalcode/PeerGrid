import type {
  Campus,
  CollaborationPost,
  FollowRecord,
  FollowSummary,
  SocialPost,
  StudentProfile,
} from "@/app/types";

type SupabaseClient = Awaited<ReturnType<typeof import("./supabase/server").createClient>>;

export async function getCampuses(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("campuses")
    .select("id, slug, name, city")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Campus[];
}

export async function getStudents(supabase: SupabaseClient, currentId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, avatar_url, campus_id, graduation_year, program, bio, goals, github_url, linkedin_url, portfolio_url, is_verified, campus:campuses(id, slug, name, city), profile_skills(skill:skills(id, name)), profile_interests(interest:interests(id, name))",
    )
    .eq("is_verified", true)
    .neq("id", currentId)
    .order("full_name");
  if (error) throw error;

  return (data ?? []).map((row) => {
    const raw = row as unknown as StudentProfile & {
      profile_skills: { skill: { id: number; name: string } | null }[];
      profile_interests: { interest: { id: number; name: string } | null }[];
    };
    return {
      ...raw,
      skills: raw.profile_skills.map((item) => item.skill).filter(Boolean),
      interests: raw.profile_interests
        .map((item) => item.interest)
        .filter(Boolean),
    } as StudentProfile;
  });
}

export async function getStudent(
  supabase: SupabaseClient,
  match: { id?: string; username?: string },
) {
  let query = supabase
    .from("profiles")
    .select(
      "id, username, full_name, avatar_url, campus_id, graduation_year, program, bio, goals, github_url, linkedin_url, portfolio_url, is_verified, campus:campuses(id, slug, name, city), profile_skills(skill:skills(id, name)), profile_interests(interest:interests(id, name))",
    );
  query = match.id ? query.eq("id", match.id) : query.eq("username", match.username ?? "");
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const raw = data as unknown as StudentProfile & {
    profile_skills: { skill: { id: number; name: string } | null }[];
    profile_interests: { interest: { id: number; name: string } | null }[];
  };
  return {
    ...raw,
    skills: raw.profile_skills.map((item) => item.skill).filter(Boolean),
    interests: raw.profile_interests.map((item) => item.interest).filter(Boolean),
  } as StudentProfile;
}

export async function getCollaborations(
  supabase: SupabaseClient,
  options: { status?: "open" | "closed"; limit?: number } = {},
) {
  let query = supabase
    .from("collaboration_posts")
    .select(
      "id, author_id, campus_id, title, description, tags, status, created_at, author:profiles!collaboration_posts_author_id_fkey(id, username, full_name, avatar_url, program), campus:campuses(id, slug, name, city)",
    )
    .order("created_at", { ascending: false });

  if (options.status) query = query.eq("status", options.status);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CollaborationPost[];
}

export async function getSocialPosts(
  supabase: SupabaseClient,
  options: { limit?: number; authorId?: string } = {},
) {
  let query = supabase
    .from("social_posts")
    .select(
      "id, author_id, body, attachment_path, attachment_kind, attachment_name, attachment_mime, created_at, author:profiles!social_posts_author_id_fkey(id, username, full_name, avatar_url, program, campus:campuses(id, slug, name, city))",
    )
    .order("created_at", { ascending: false });

  if (options.authorId) query = query.eq("author_id", options.authorId);
  if (options.limit) query = query.limit(options.limit);
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

  return Promise.all(
    (data ?? []).map(async (row) => {
      const post = row as unknown as Omit<SocialPost, "attachment_url" | "like_count" | "comment_count" | "viewer_liked">;
      let attachmentUrl: string | null = null;
      if (post.attachment_path) {
        const { data: signed } = await supabase.storage
          .from("post-media")
          .createSignedUrl(post.attachment_path, 60 * 60);
        attachmentUrl = signed?.signedUrl ?? null;
      }
      return {
        ...post,
        attachment_url: attachmentUrl,
        ...(engagement.get(post.id) ?? { like_count: 0, comment_count: 0, viewer_liked: false }),
      } as SocialPost;
    }),
  );
}

export async function getFollows(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id, following_id, created_at")
    .or(`follower_id.eq.${userId},following_id.eq.${userId}`)
    .order("created_at", { ascending: false });
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
