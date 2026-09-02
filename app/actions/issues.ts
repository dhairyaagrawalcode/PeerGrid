"use server";
import { requireUser } from "@/app/lib/auth";
export async function submitIssue(category: string, title: string, description: string, path: string): Promise<{ error?: string; id?: string }> {
  const { supabase } = await requireUser();
  if ([category,title,description,path].some(value => typeof value !== "string")) return { error: "Invalid report." };
  if (!["bug","not_working","account","content","suggestion","other"].includes(category) || title.trim().length < 5 || title.length > 120 || description.trim().length < 10 || description.length > 4000) return { error: "Add a title (5–120 characters) and description (10–4,000 characters)." };
  const source = path.startsWith("/") && !path.startsWith("//") ? path.split(/[?#]/)[0].slice(0,250) : "/";
  const { data, error } = await supabase.rpc("submit_issue_report", { issue_category: category, issue_title: title, issue_description: description, page_path: source });
  if (error) return { error: error.message.includes("ISSUE_RATE_LIMIT") ? "You have submitted several reports. Please try again in an hour." : "Your report could not be sent. Your text is still here; please retry." };
  return { id: String(data) };
}
