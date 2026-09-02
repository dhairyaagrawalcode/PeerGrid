import { requireStudent } from "@/app/lib/auth";
import IssueReportForm from "@/app/components/issue-report-form";
export default async function ReportProblemPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  await requireStudent();
  const { from } = await searchParams;
  const source = from?.startsWith("/") && !from.startsWith("//") ? from.split(/[?#]/)[0].slice(0,250) : "/";
  return <div className="app-page mx-auto max-w-2xl"><p className="eyebrow">Help</p><h1 className="mt-2 text-2xl font-bold">Report a problem</h1><p className="mt-3 text-sm text-muted">Help us improve PeerGrid.</p><IssueReportForm source={source} /></div>;
}

