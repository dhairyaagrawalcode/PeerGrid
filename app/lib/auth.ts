import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/app/lib/supabase/server";
import type { StudentApproval, StudentProfile } from "@/app/types";
import { accessDestination } from "@/app/lib/platform-access";
import { normalizeStudent, studentSelect } from "@/app/lib/data";

export const getAuthContext = cache(async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, profile: null, approval: null };

  // All three queries depend on the verified user, not on one another. Access is
  // still checked before returning any profile data, and this cache is per render.
  const [{ data: access, error: accessError }, { data, error: profileError }, { data: approval, error: approvalError }] = await Promise.all([
    supabase.rpc("get_platform_access"),
    supabase
      .from("profiles")
      .select(
        studentSelect,
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("student_approvals")
      .select("user_id, email, status, review_note, submitted_at, reviewed_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const destination = accessDestination(accessError ? null : access, true);
  if (destination) redirect(destination);
  if (profileError) throw new Error("Unable to load your profile", { cause: profileError });
  if (approvalError) throw new Error("Unable to check student approval", { cause: approvalError });

  return {
    supabase,
    user,
    profile: data ? normalizeStudent(data) : null,
    approval: approval as StudentApproval | null,
  };
});

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
