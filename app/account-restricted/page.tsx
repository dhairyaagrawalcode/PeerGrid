import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import AccessNotice from "@/app/components/access-notice";
export const dynamic = "force-dynamic";
export default async function AccountRestrictedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: access, error } = await supabase.rpc("get_platform_access");
  if (error || !access) redirect("/service-unavailable");
  if (access.is_admin) redirect("/admin");
  if (access.account_status === "active") redirect("/feed");
  return <AccessNotice title="Account access restricted" message="This account cannot access PeerGrid right now. Please contact the PeerGrid administrator if you believe this is a mistake." signedIn />;
}

