"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

export default function ConnectForCollaborationButton({ collaborationId, creatorId, title }: {
  collaborationId: string;
  creatorId: string;
  title: string;
}) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  async function openConversation() {
    if (opening) return;
    setOpening(true);
    setError(false);
    const { data, error: conversationError } = await supabase.rpc("get_or_create_conversation", { other_user_id: creatorId });
    if (conversationError || !data) {
      setOpening(false);
      setError(true);
      return;
    }
    await supabase.rpc("record_recommendation_event", {
      candidate_entity_type: "collaboration",
      candidate_entity_id: collaborationId,
      candidate_event_type: "connect",
    });
    const conversationId = String(data);
    sessionStorage.setItem(
      `peergrid:collaboration-draft:${conversationId}`,
      `Hey, I'm interested in "${title.slice(0, 100)}" and would like to work on this with you.`,
    );
    router.push(`/messages/${conversationId}`);
  }

  return <div className="text-right">
    <button className="button button-primary !min-h-9 !px-3 !text-xs" disabled={opening} onClick={openConversation} type="button">
      {opening ? "Opening…" : "Connect for this"}
    </button>
    {error && <p className="mt-1 text-[10px] text-danger">Could not open the conversation.</p>}
  </div>;
}
