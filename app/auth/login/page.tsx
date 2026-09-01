import type { Metadata } from "next";
import AuthForm from "@/app/components/auth-form";
import AuthShell from "@/app/components/auth-shell";
import SetupRequired from "@/app/components/setup-required";
import { isSupabaseConfigured } from "@/app/lib/supabase/config";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  if (!isSupabaseConfigured()) return <SetupRequired />;
  return <AuthShell eyebrow="Welcome back" title="Sign in to your network" copy="Use the verified college email attached to your PeerGrid account."><AuthForm mode="login" /></AuthShell>;
}
