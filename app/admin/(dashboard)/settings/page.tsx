import { adminQuery } from "@/app/lib/admin";
import type { PlatformAccess } from "@/app/types/admin";
import AdminMaintenance from "@/app/components/admin-maintenance";
export default async function SettingsPage() {
  const access = await adminQuery<PlatformAccess>("get_platform_access");
  return <div><h1 className="text-2xl font-bold">Settings</h1><AdminMaintenance enabled={access.maintenance_enabled} message={access.maintenance_message} /></div>;
}
