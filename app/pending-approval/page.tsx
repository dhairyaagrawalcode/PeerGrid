import { redirect } from "next/navigation";
import { FiClock, FiShield, FiXCircle } from "react-icons/fi";
import { signOut } from "@/app/actions/auth";
import ApprovalRefresh from "@/app/components/approval-refresh";
import Brand from "@/app/components/brand";
import SetupRequired from "@/app/components/setup-required";
import { getAuthContext } from "@/app/lib/auth";
import { isSupabaseConfigured } from "@/app/lib/supabase/config";

export default async function PendingApprovalPage() {
  if (!isSupabaseConfigured()) return <SetupRequired />;
  const { user, profile, approval } = await getAuthContext();
  if (!user) redirect("/auth/login");
  if (!user.email_confirmed_at) {
    redirect(`/auth/check-email?email=${encodeURIComponent(user.email ?? "")}`);
  }
  if (approval?.status === "approved") {
    redirect(
      profile?.username && profile.full_name && profile.campus_id
        ? "/feed"
        : "/onboarding",
    );
  }

  const rejected = approval?.status === "rejected";

  return (
    <main className="grid min-h-screen place-items-center bg-bg p-5 text-font">
      <section className="surface w-full max-w-md p-7 text-center sm:p-9">
        <div className="flex justify-center"><Brand /></div>
        <div className={`mx-auto mt-9 grid h-14 w-14 place-items-center rounded-2xl ${rejected ? "bg-rose-400/10 text-rose-300" : "bg-primary/10 text-primary"}`}>
          {rejected ? <FiXCircle size={25} /> : <FiClock size={25} />}
        </div>
        <p className="eyebrow mt-6"><FiShield /> Manual verification</p>
        <h1 className="mt-3 text-2xl font-bold">
          {rejected ? "Your request was not approved" : "Your account is awaiting approval"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {rejected
            ? approval?.review_note || "The PeerGrid administrator could not verify this account. Contact the administrator if you believe this is a mistake."
            : "Your email is confirmed. A PeerGrid administrator will verify your NST student status before you can create a profile or access the network."}
        </p>
        {!rejected && <div className="mt-7"><ApprovalRefresh /></div>}
        <form action={signOut} className="mt-3">
          <button className="button button-ghost w-full" type="submit">Sign out</button>
        </form>
      </section>
    </main>
  );
}

