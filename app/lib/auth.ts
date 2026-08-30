import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import type { StudentApproval, StudentProfile } from "@/app/types";

export async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, profile: null, approval: null };

  const [{ data }, { data: approval }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, username, full_name, avatar_url, campus_id, graduation_year, program, bio, goals, github_url, linkedin_url, portfolio_url, is_verified, campus:campuses(id, slug, name, city)",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("student_approvals")
      .select("user_id, email, status, review_note, submitted_at, reviewed_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return {
    supabase,
    user,
    profile: data as StudentProfile | null,
    approval: approval as StudentApproval | null,
  };
}

export async function requireUser() {
  const context = await getAuthContext();
  if (!context.user) redirect("/auth/login");
  return context as typeof context & { user: NonNullable<typeof context.user> };
}

export async function requireStudent() {
  const context = await requireApprovedUser();
  const profile = context.profile;
  if (
    !profile?.is_verified ||
    !profile.username ||
    !profile.full_name ||
    !profile.campus_id
  ) {
    redirect("/onboarding");
  }
  return context as typeof context & { profile: StudentProfile };
}

export async function requireApprovedUser() {
  const context = await requireUser();
  if (!context.user.email_confirmed_at) {
    redirect(
      `/auth/check-email?email=${encodeURIComponent(context.user.email ?? "")}`,
    );
  }
  if (context.approval?.status !== "approved") {
    redirect("/pending-approval");
  }
  return context as typeof context & { approval: StudentApproval };
}
