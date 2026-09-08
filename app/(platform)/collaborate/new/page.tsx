import CollaborationCreateForm from "@/app/components/collaboration-create-form";
import { requireStudent } from "@/app/lib/auth";
import { getCampuses } from "@/app/lib/data";

export default async function NewCollaborationPage() {
  const { supabase } = await requireStudent();
  return <div className="app-page max-w-2xl"><CollaborationCreateForm campuses={await getCampuses(supabase)} /></div>;
}
