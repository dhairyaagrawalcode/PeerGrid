import type { Metadata } from "next";
import AuthForm from "@/app/components/auth-form";
import AuthShell from "@/app/components/auth-shell";
import SetupRequired from "@/app/components/setup-required";
import { isSupabaseConfigured } from "@/app/lib/supabase/config";

export const metadata: Metadata = { title: "Join" };

export default function SignupPage() {
  if (!isSupabaseConfigured()) return <SetupRequired />;
  return <AuthShell eyebrow="Verified access" title="Join the NST student grid" copy="Create your account with an approved NST student email. You will verify it before setting up your profile."><AuthForm mode="signup" /></AuthShell>;
}
