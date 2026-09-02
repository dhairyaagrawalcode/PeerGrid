import { adminQuery } from "@/app/lib/admin";
import type { AdminOverview } from "@/app/types/admin";
import AdminChart from "@/app/components/admin-chart";
export default async function AnalyticsPage() {
  const data = await adminQuery<AdminOverview>("admin_overview");
  return <><h1 className="text-2xl font-bold">Analytics</h1><p className="mt-2 text-sm text-muted">Signups count Auth accounts, not profile creation. Activity uses recorded sessions (sampled up to every five minutes); it is not online presence. Times are IST. Historical activity before tracking was enabled is unavailable.</p><div className="mt-8 grid gap-10"><AdminChart title="Signups · last 30 days" points={data.signups} /><AdminChart title="Daily active users · last 30 days" points={data.active_days} /><AdminChart title="Hourly active users · last 24 hours" points={data.active_hours} hourly /></div></>;
}
