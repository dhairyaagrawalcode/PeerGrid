import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import AccessNotice from "@/app/components/access-notice";
export const dynamic = "force-dynamic";
export default async function MaintenancePage() {
  const supabase = await createClient();
  const [{ data: access, error }, { data: { user } }] = await Promise.all([supabase.rpc("get_platform_access"), supabase.auth.getUser()]);
  if (error || !access) redirect("/service-unavailable");
  if (access.is_admin) redirect("/admin");
  if (!access.maintenance_enabled) redirect(user ? "/feed" : "/");
  return <AccessNotice title="We’ll be back shortly" message={access.maintenance_message} signedIn={!!user} />;
}

