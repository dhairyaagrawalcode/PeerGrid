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
