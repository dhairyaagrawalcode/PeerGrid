"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStudent } from "@/app/lib/auth";
import { splitTags } from "@/app/lib/format";
import { moderateContent } from "@/app/lib/moderation";
export type CreateCollaborationState = { error: string } | null;

export async function createCollaboration(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const campus = String(formData.get("campusId") ?? "");
  const collaborationType = String(formData.get("collaborationType") ?? "project");
  const requiredSkills = splitTags(String(formData.get("requiredSkills") ?? ""));
  const commitment = String(formData.get("commitment") ?? "").trim();
  const teamCurrent = Number(formData.get("teamCurrent") ?? 1);
  const capacityRaw = String(formData.get("teamCapacity") ?? "").trim();
  const teamCapacity = capacityRaw ? Number(capacityRaw) : null;
  if (title.length < 5 || title.length > 100) return { error: "Use a title between 5 and 100 characters." };
  if (description.length < 10 || description.length > 1200) return { error: "Describe the collaboration in 10–1,200 characters." };
  if (!["project", "hackathon", "open_source", "startup", "study", "other"].includes(collaborationType)) return { error: "Choose a valid collaboration type." };
  if (requiredSkills.length > 12 || commitment.length > 80) return { error: "Check the required skills and commitment fields." };
  if (!Number.isInteger(teamCurrent) || teamCurrent < 1 || teamCurrent > 50) return { error: "Current team size must be between 1 and 50." };
  if (teamCapacity === null || !Number.isInteger(teamCapacity) || teamCapacity < teamCurrent || teamCapacity > 50) return { error: "Capacity must be at least the current team size and no more than 50." };
  if (moderateContent(`${title} ${description}`).status === "rejected") return { error: "This collaboration violates PeerGrid's community rules and cannot be published." };
  const { data: created, error } = await supabase.from("collaboration_posts").insert({
    author_id: user.id,
    campus_id: campus || null,
    title,
    description,
    tags: [],
    collaboration_type: collaborationType,
    required_skills: requiredSkills,
    commitment: commitment || null,
    team_current: teamCurrent,
    team_capacity: teamCapacity,
  }).select("moderation_status").single();
  if (!error) {
    revalidatePath("/feed");
    revalidatePath("/collaborate");
    redirect(created?.moderation_status === "held" ? "/collaborate?moderation=held" : created?.moderation_status === "rejected" ? "/collaborate?moderation=rejected" : "/collaborate?create=published");
  }
  console.error("[PeerGrid] collaboration creation failed", { code: error?.code });
  return { error: "The collaboration could not be published. Please try again." };
}

function parseParticipants(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 20).map((entry) => {
      const participant = entry as { username?: unknown; role?: unknown };
      return {
        username: String(participant.username ?? "").trim().replace(/^@/, "").toLowerCase(),
        role: String(participant.role ?? "").trim(),
      };
    });
  } catch {
    return [];
  }
}

export async function searchCollaborationParticipants(query: string) {
  const { supabase, user } = await requireStudent();
  const searchText = query.trim().slice(0, 80);
  if (searchText.length < 2) return [];
  const { data, error } = await supabase.rpc("search_student_profiles", {
    search_text: searchText,
    result_limit: 8,
    result_offset: 0,
  });
  if (error) return [];
  return (data ?? []).filter((row: { id: string }) => row.id !== user.id).slice(0, 8).map((row: { id: string; username: string; full_name: string; avatar_url: string | null; campus?: { name?: string } | null }) => ({
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    campus_name: row.campus?.name ?? null,
  }));
}

export async function completeCollaboration(formData: FormData) {
  const { supabase } = await requireStudent();
  const id = String(formData.get("id") ?? "");
  const creatorRole = String(formData.get("creatorRole") ?? "").trim();
  const skills = splitTags(String(formData.get("skillsUsed") ?? ""));
  const duration = String(formData.get("duration") ?? "").trim();
  const projectUrl = String(formData.get("projectUrl") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim();
  const participants = parseParticipants(String(formData.get("participants") ?? ""));
  if (!id || creatorRole.length < 2 || creatorRole.length > 80 || !skills.length || skills.length > 20 || duration.length < 1 || duration.length > 80 || outcome.length > 500 || !participants.length) redirect("/collaborate?completion=error");
  if (participants.some((participant) => participant.username.length < 3 || participant.role.length < 2 || participant.role.length > 80)) return;
  const { error } = await supabase.rpc("complete_collaboration", {
    candidate_collaboration_id: id,
    creator_role: creatorRole,
    candidate_skills: skills,
    candidate_duration: duration,
    candidate_project_url: projectUrl,
    candidate_outcome: outcome,
    participant_entries: participants,
  });
  if (!error) {
    revalidatePath("/collaborate");
    revalidatePath("/profile");
    redirect("/collaborate?completion=recorded");
  }
  console.error("[PeerGrid] collaboration completion failed", { code: error?.code });
  redirect("/collaborate?completion=error");
}

export async function updateCollaborationDetails(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const campus = String(formData.get("campusId") ?? "");
  const collaborationType = String(formData.get("collaborationType") ?? "project");
  const requiredSkills = splitTags(String(formData.get("requiredSkills") ?? ""));
  const commitment = String(formData.get("commitment") ?? "").trim();
  if (!id || title.length < 5 || title.length > 100 || description.length < 10 || description.length > 1200) return;
  if (!["project", "hackathon", "open_source", "startup", "study", "other"].includes(collaborationType)) return;
  if (requiredSkills.length > 12 || commitment.length > 80) return;
  if (moderateContent(`${title} ${description}`).status === "rejected") redirect("/collaborate?moderation=rejected");
  const { data: updated, error } = await supabase.from("collaboration_posts").update({
    title,
    description,
    campus_id: campus || null,
    collaboration_type: collaborationType,
    required_skills: requiredSkills,
    commitment: commitment || null,
  }).eq("id", id).eq("author_id", user.id).select("moderation_status").maybeSingle();
  if (error) redirect("/collaborate?create=error");
  revalidatePath("/collaborate");
  if (updated?.moderation_status === "held") redirect("/collaborate?moderation=held");
  if (updated?.moderation_status === "rejected") redirect("/collaborate?moderation=rejected");
}

export async function confirmCollaborationParticipation(formData: FormData) {
  const { supabase } = await requireStudent();
  const passportId = String(formData.get("passportId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const requestedReturnTo = String(formData.get("returnTo") ?? "/profile");
  const returnTo = requestedReturnTo === "/notifications" ? "/notifications" : "/profile";
  if (!passportId || !["confirm", "decline"].includes(decision)) return;
  const { data, error } = await supabase.rpc("confirm_collaboration_participation", {
    candidate_passport_id: passportId,
    accept_participation: decision === "confirm",
  });
  if (error || data !== true) {
    console.error("[PeerGrid] collaboration confirmation failed", { code: error?.code });
    redirect(`${returnTo}?confirmation=error`);
  }
  revalidatePath("/profile");
  revalidatePath("/notifications");
  redirect(returnTo);
}

export async function updateCollaborationTeam(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const id = String(formData.get("id") ?? "");
  const teamCurrent = Number(formData.get("teamCurrent") ?? 1);
  const capacityRaw = String(formData.get("teamCapacity") ?? "").trim();
  const teamCapacity = capacityRaw ? Number(capacityRaw) : null;
  if (!id || !Number.isInteger(teamCurrent) || teamCurrent < 1 || teamCurrent > 50) return;
  if (teamCapacity !== null && (!Number.isInteger(teamCapacity) || teamCapacity < teamCurrent || teamCapacity > 50)) return;
  await supabase
    .from("collaboration_posts")
    .update({ team_current: teamCurrent, team_capacity: teamCapacity })
    .eq("id", id)
    .eq("author_id", user.id);
  revalidatePath("/feed");
  revalidatePath("/collaborate");
}

export async function setCollaborationStatus(formData: FormData) {
  const { supabase } = await requireStudent();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["open", "full", "closed"].includes(status)) return;
  await supabase.rpc("set_collaboration_open_state", {
    candidate_collaboration_id: id,
    candidate_status: status,
  });
  revalidatePath("/feed");
  revalidatePath("/collaborate");
}

export async function deleteCollaboration(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { error } = await supabase.from("collaboration_posts").delete().eq("id", id).eq("author_id", user.id);
  revalidatePath("/feed");
  revalidatePath("/collaborate");
  redirect(error ? "/collaborate?delete=error" : "/collaborate?delete=success");
}
