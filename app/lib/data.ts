import type {
  Campus,
  CollaborationPost,
  ConnectionRecord,
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

export async function getConnections(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("connection_requests")
    .select("id, requester_id, recipient_id, status, created_at")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
  if (error) throw error;
  return (data ?? []) as ConnectionRecord[];
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
