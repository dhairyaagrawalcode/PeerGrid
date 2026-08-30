"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowRight, FiLoader, FiLock, FiMail } from "react-icons/fi";
import { createClient } from "@/app/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "").trim();
    const supabase = createClient();

    if (mode === "signup") {
      const { data: allowed, error: domainError } = await supabase.rpc(
        "is_email_domain_allowed",
        { candidate_email: email },
      );
      if (domainError || !allowed) {
        setMessage(
          domainError
            ? "PeerGrid could not verify the allowed-domain list. Try again shortly."
            : "That email domain is not currently approved for NST student access.",
        );
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });
      if (error) {
        setMessage(error.message);
      } else if (!data.session) {
        router.push(`/auth/check-email?email=${encodeURIComponent(email)}`);
      } else {
        router.push("/onboarding");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        router.push("/feed");
        router.refresh();
      }
    }
    setLoading(false);
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={submit}>
      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="fullName">Full name</label>
          <input className="field" id="fullName" name="fullName" minLength={2} maxLength={80} autoComplete="name" required />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">College email</label>
        <div className="relative">
          <FiMail className="absolute left-3.5 top-3.5 text-muted" />
          <input className="field !pl-10" id="email" name="email" type="email" autoComplete="email" placeholder="you@college.edu" required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <div className="relative">
          <FiLock className="absolute left-3.5 top-3.5 text-muted" />
          <input className="field !pl-10" id="password" name="password" type="password" minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
        </div>
      </div>
      {message && <p className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm text-danger" role="alert">{message}</p>}
      <button className="button button-primary w-full" disabled={loading} type="submit">
        {loading ? <><FiLoader className="animate-spin" /> Please wait</> : <>{mode === "signup" ? "Create verified account" : "Sign in"}<FiArrowRight /></>}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "signup" ? "Already on PeerGrid?" : "New to PeerGrid?"}{" "}
        <Link className="font-semibold text-primary hover:underline" href={mode === "signup" ? "/auth/login" : "/auth/signup"}>
          {mode === "signup" ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
