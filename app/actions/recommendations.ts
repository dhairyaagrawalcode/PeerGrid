"use server";

import { requireStudent } from "@/app/lib/auth";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function recordCollaborationViews(collaborationIds: string[]) {
  const ids = [...new Set(collaborationIds)].filter((id) => uuidPattern.test(id)).slice(0, 20);
  if (!ids.length) return;

  const { supabase } = await requireStudent();
  await Promise.all(
    ids.map((entityId) =>
      supabase.rpc("record_recommendation_event", {
        candidate_entity_type: "collaboration",
        candidate_entity_id: entityId,
        candidate_event_type: "view",
      }),
    ),
  );
}

export async function recordPostPreference(postId: string, preference: "interested" | "not_interested") {
  if (!uuidPattern.test(postId) || !["interested", "not_interested"].includes(preference)) return { error: "Invalid preference." };
  const { supabase } = await requireStudent();
  const { data, error } = await supabase.rpc("record_recommendation_event", {
    candidate_entity_type: "post",
    candidate_entity_id: postId,
    candidate_event_type: preference,
  });
  if (error || !data) return { error: "Your feed preference could not be saved. Please try again." };
  return { success: true };
}
