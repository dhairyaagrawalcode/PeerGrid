"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApprovedUser } from "@/app/lib/auth";
import { safeExternalUrl, splitTags } from "@/app/lib/format";

export type ProfileFormState = { error?: string };

async function syncTags(
  supabase: Awaited<ReturnType<typeof import("@/app/lib/supabase/server").createClient>>,
  userId: string,
  table: "skills" | "interests",
  junction: "profile_skills" | "profile_interests" | "profile_can_help" | "profile_needs_help",
  foreignKey: "skill_id" | "interest_id",
  raw: string,
) {
  const names = splitTags(raw);
  await supabase.from(junction).delete().eq("profile_id", userId);
  if (!names.length) return;

  const { error: insertError } = await supabase
    .from(table)
    .upsert(names.map((name) => ({ name })), { onConflict: "name", ignoreDuplicates: true });
  if (insertError) throw insertError;

  const { data, error } = await supabase.from(table).select("id").in("name", names);
  if (error) throw error;
  const { error: linkError } = await supabase.from(junction).insert(
    (data ?? []).map((item) => ({ profile_id: userId, [foreignKey]: item.id })),
  );
  if (linkError) throw linkError;
}

export async function saveProfile(_: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const { supabase, user, profile } = await requireApprovedUser();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase().replace(/^@/, "");
  const campusId = String(formData.get("campusId") ?? "");
  const graduationYearRaw = String(formData.get("graduationYear") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/profile");

  if (fullName.length < 2 || fullName.length > 80) return { error: "Enter your full name." };
  if (!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(username)) return { error: "Username must be 3–30 characters using letters, numbers, _ or -." };
  if (!campusId) return { error: "Select your NST campus." };
  const graduationYear = graduationYearRaw ? Number(graduationYearRaw) : null;
  if (graduationYear !== null && (!Number.isInteger(graduationYear) || graduationYear < 2024 || graduationYear > 2040)) {
    return { error: "Enter a valid graduation year." };
  }
  const program = String(formData.get("program") ?? "").trim();
  if (program.length > 100) return { error: "Program can contain up to 100 characters." };
  const currentStatus = String(formData.get("currentStatus") ?? "").trim();
  if (currentStatus.length > 120) return { error: "Current status can contain up to 120 characters." };

  const { data: verified, error: verifyError } = await supabase.rpc("refresh_profile_verification");
  if (verifyError || !verified) return { error: "Verify an approved NST college email before completing your profile." };

  let avatarUrl: string | null | undefined;
  let uploadedAvatarPath: string | null = null;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (avatar.size > 3 * 1024 * 1024) return { error: "Profile photo must be smaller than 3 MB." };
    if (!["image/jpeg", "image/png", "image/webp"].includes(avatar.type)) return { error: "Use a JPG, PNG, or WebP profile photo." };
    const extension = avatar.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("avatars").upload(path, avatar, {
      cacheControl: "31536000",
      upsert: false,
      contentType: avatar.type,
    });
    if (error) return { error: "Your profile photo could not be uploaded. Please try again." };
    uploadedAvatarPath = path;
    avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  const payload: Record<string, string | number | null> = {
    full_name: fullName,
    username,
    campus_id: campusId,
    graduation_year: graduationYear,
    program: program || null,
    current_status: currentStatus || null,
    bio: String(formData.get("bio") ?? "").trim() || null,
    goals: String(formData.get("goals") ?? "").trim() || null,
    github_url: safeExternalUrl(formData.get("githubUrl")),
    linkedin_url: safeExternalUrl(formData.get("linkedinUrl")),
    portfolio_url: safeExternalUrl(formData.get("portfolioUrl")),
  };
  if (avatarUrl) payload.avatar_url = avatarUrl;

  const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
  if (error) {
    if (uploadedAvatarPath) await supabase.storage.from("avatars").remove([uploadedAvatarPath]);
    return { error: error.code === "23505" ? "That username is already taken." : "Your profile could not be saved. Please try again." };
  }

  if (uploadedAvatarPath && profile?.avatar_url) {
    try {
      const marker = "/storage/v1/object/public/avatars/";
      const pathname = new URL(profile.avatar_url).pathname;
      const previousPath = pathname.includes(marker)
        ? decodeURIComponent(pathname.split(marker)[1] ?? "")
        : "";
      if (previousPath.startsWith(`${user.id}/`) && previousPath !== uploadedAvatarPath) {
        await supabase.storage.from("avatars").remove([previousPath]);
      }
    } catch {
      // A legacy external avatar should not block saving the new profile photo.
    }
  }

  try {
    await syncTags(supabase, user.id, "skills", "profile_skills", "skill_id", String(formData.get("skills") ?? ""));
    await syncTags(supabase, user.id, "interests", "profile_interests", "interest_id", String(formData.get("interests") ?? ""));
    await syncTags(supabase, user.id, "skills", "profile_can_help", "skill_id", String(formData.get("canHelpWith") ?? ""));
    await syncTags(supabase, user.id, "skills", "profile_needs_help", "skill_id", String(formData.get("needsHelpWith") ?? ""));
  } catch (tagError) {
    console.error("[PeerGrid] profile taxonomy sync failed", {
      name: tagError instanceof Error ? tagError.name : "UnknownError",
    });
    return { error: "Your profile was saved, but skills and interests could not be updated. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect(returnTo.startsWith("/") ? returnTo : "/profile");
}
